use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use serde::Deserialize;
use tokio::sync::RwLock;
use tracing::error;

#[derive(Debug, Clone)]
pub struct GitHubStats {
    pub commits_last_year: u32,
    pub current_streak: u32,
    pub total_stars: u32,
    pub merged_prs: u32,
}

pub type GitHubStatsCache = Arc<RwLock<HashMap<String, (GitHubStats, Instant)>>>;

const CACHE_TTL: Duration = Duration::from_secs(3600);

#[derive(Deserialize)]
struct GraphQlResponse {
    data: Option<GraphQlData>,
}

#[derive(Deserialize)]
struct GraphQlData {
    user: Option<GraphQlUser>,
}

#[derive(Deserialize)]
struct GraphQlUser {
    #[serde(rename = "contributionsCollection")]
    contributions_collection: ContributionsCollection,
    #[serde(rename = "pullRequests")]
    pull_requests: PullRequests,
    repositories: Repositories,
}

#[derive(Deserialize)]
struct ContributionsCollection {
    #[serde(rename = "totalCommitContributions")]
    total_commit_contributions: u32,
    #[serde(rename = "contributionCalendar")]
    contribution_calendar: ContributionCalendar,
}

#[derive(Deserialize)]
struct ContributionCalendar {
    weeks: Vec<ContributionWeek>,
}

#[derive(Deserialize)]
struct ContributionWeek {
    #[serde(rename = "contributionDays")]
    contribution_days: Vec<ContributionDay>,
}

#[derive(Deserialize)]
struct ContributionDay {
    #[serde(rename = "contributionCount")]
    contribution_count: u32,
    date: String,
}

#[derive(Deserialize)]
struct PullRequests {
    #[serde(rename = "totalCount")]
    total_count: u32,
}

#[derive(Deserialize)]
struct Repositories {
    nodes: Vec<Repository>,
}

#[derive(Deserialize)]
struct Repository {
    #[serde(rename = "stargazerCount")]
    stargazer_count: u32,
}

pub async fn fetch_github_stats(
    username: &str,
    token: &str,
    cache: &GitHubStatsCache,
) -> Result<GitHubStats, String> {
    // Check cache first
    {
        let read = cache.read().await;
        if let Some((stats, cached_at)) = read.get(username) {
            if cached_at.elapsed() < CACHE_TTL {
                return Ok(stats.clone());
            }
        }
    }

    let now = chrono::Utc::now();
    let one_year_ago = now - chrono::Duration::days(365);
    let from = one_year_ago.to_rfc3339();
    let to = now.to_rfc3339();

    let query = r#"
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      contributionCalendar {
        weeks {
          contributionDays {
            contributionCount
            date
          }
        }
      }
    }
    pullRequests(states: MERGED) {
      totalCount
    }
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
      nodes {
        stargazerCount
      }
    }
  }
}
"#;

    let body = serde_json::json!({
        "query": query,
        "variables": {
            "login": username,
            "from": from,
            "to": to,
        }
    });

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.github.com/graphql")
        .header("Authorization", format!("Bearer {token}"))
        .header("User-Agent", "GitGarden")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            error!("GitHub GraphQL request failed: {}", e);
            format!("GitHub request failed: {e}")
        })?;

    let gql_response: GraphQlResponse = response.json().await.map_err(|e| {
        error!("Failed to parse GitHub GraphQL response: {}", e);
        format!("Failed to parse GitHub response: {e}")
    })?;

    let user_data = gql_response
        .data
        .and_then(|d| d.user)
        .ok_or_else(|| "GitHub user not found".to_string())?;

    let commits_last_year = user_data
        .contributions_collection
        .total_commit_contributions;
    let merged_prs = user_data.pull_requests.total_count;
    let total_stars: u32 = user_data
        .repositories
        .nodes
        .iter()
        .map(|r| r.stargazer_count)
        .sum();

    // Calculate current streak: collect all days in order
    let mut all_days: Vec<ContributionDay> = user_data
        .contributions_collection
        .contribution_calendar
        .weeks
        .into_iter()
        .flat_map(|w| w.contribution_days)
        .collect();

    // Sort by date descending
    all_days.sort_by(|a, b| b.date.cmp(&a.date));

    // Walk from most recent day, count consecutive days with contributions > 0
    // Start from yesterday (or today if today has contributions)
    let today_str = now.format("%Y-%m-%d").to_string();
    let yesterday_str = (now - chrono::Duration::days(1))
        .format("%Y-%m-%d")
        .to_string();

    let mut current_streak: u32 = 0;
    let mut streak_started = false;

    for day in &all_days {
        if !streak_started {
            // Allow starting from today or yesterday
            if day.date == today_str || day.date == yesterday_str {
                if day.contribution_count > 0 {
                    streak_started = true;
                    current_streak += 1;
                } else if day.date == yesterday_str {
                    // No contributions yesterday, streak is 0
                    break;
                }
                // If today has 0 contributions, check yesterday next iteration
                if day.date == today_str && day.contribution_count == 0 {
                    continue;
                }
            } else {
                break;
            }
        } else if day.contribution_count > 0 {
            current_streak += 1;
        } else {
            break;
        }
    }

    let stats = GitHubStats {
        commits_last_year,
        current_streak,
        total_stars,
        merged_prs,
    };

    // Store in cache
    {
        let mut write = cache.write().await;
        write.insert(username.to_string(), (stats.clone(), Instant::now()));
    }

    Ok(stats)
}
