use tracing::error;

pub struct EmailConfig {
    pub resend_api_key: String,
    pub from: String,
    pub app_url: String,
}

pub async fn send_verification_email(config: &EmailConfig, to_email: &str, token: &str) -> bool {
    let verify_url = format!("{}/verify-email?token={}", config.app_url, token);

    let body = format!(
        "Welcome to GitGarden!\n\nVerify your email:\n\n{verify_url}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, ignore this email."
    );

    let client = reqwest::Client::new();
    let res = client
        .post("https://api.resend.com/emails")
        .bearer_auth(&config.resend_api_key)
        .json(&serde_json::json!({
            "from": config.from,
            "to": [to_email],
            "subject": "Verify your GitGarden email",
            "text": body,
        }))
        .send()
        .await;

    match res {
        Ok(r) if r.status().is_success() => true,
        Ok(r) => {
            let status = r.status();
            let text = r.text().await.unwrap_or_default();
            error!("Resend API error {}: {}", status, text);
            false
        }
        Err(e) => {
            error!("Failed to send email: {}", e);
            false
        }
    }
}
