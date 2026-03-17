use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};
use tracing::error;

pub struct EmailConfig {
    pub smtp_host: String,
    pub smtp_port: u16,
    pub smtp_username: String,
    pub smtp_password: String,
    pub smtp_from: String,
    pub app_url: String,
}

pub async fn send_verification_email(config: &EmailConfig, to_email: &str, token: &str) -> bool {
    let verify_url = format!("{}/verify-email?token={}", config.app_url, token);

    let body = format!(
        "Welcome to GitGarden!\n\nPlease verify your email address by clicking the link below:\n\n{verify_url}\n\nThis link expires in 24 hours.\n\nIf you did not create an account, you can ignore this email."
    );

    let email = match Message::builder()
        .from(config.smtp_from.parse().unwrap())
        .to(match to_email.parse() {
            Ok(addr) => addr,
            Err(e) => {
                error!("Failed to parse email address: {}", e);
                return false;
            }
        })
        .subject("Verify your GitGarden email")
        .header(ContentType::TEXT_PLAIN)
        .body(body)
    {
        Ok(e) => e,
        Err(e) => {
            error!("Failed to build email: {}", e);
            return false;
        }
    };

    let creds = Credentials::new(config.smtp_username.clone(), config.smtp_password.clone());

    let mailer = match AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&config.smtp_host) {
        Ok(b) => b.port(config.smtp_port).credentials(creds).build(),
        Err(e) => {
            error!("Failed to build SMTP transport: {}", e);
            return false;
        }
    };

    match mailer.send(email).await {
        Ok(_) => true,
        Err(e) => {
            error!("Failed to send email: {}", e);
            false
        }
    }
}
