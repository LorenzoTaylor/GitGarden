use rustrict::CensorStr;

pub enum ValidationError {
    UsernameTooShort,
    UsernameTooLong,
    UsernameInvalidChars,
    UsernameInappropriate,
    PasswordTooShort,
    PasswordNoUppercase,
    PasswordNoLowercase,
    PasswordNoNumber,
    PasswordNoSymbol,
}

impl ValidationError {
    pub fn message(&self) -> &'static str {
        match self {
            Self::UsernameTooShort => "Username must be at least 3 characters",
            Self::UsernameTooLong => "Username must be at most 30 characters",
            Self::UsernameInvalidChars => "Username can only contain letters, numbers, underscores, and hyphens",
            Self::UsernameInappropriate => "Username contains inappropriate content",
            Self::PasswordTooShort => "Password must be at least 8 characters",
            Self::PasswordNoUppercase => "Password must contain at least one uppercase letter",
            Self::PasswordNoLowercase => "Password must contain at least one lowercase letter",
            Self::PasswordNoNumber => "Password must contain at least one number",
            Self::PasswordNoSymbol => "Password must contain at least one symbol (!@#$...)",
        }
    }
}

pub fn validate_username(username: &str) -> Result<(), ValidationError> {
    if username.len() < 3 {
        return Err(ValidationError::UsernameTooShort);
    }
    if username.len() > 30 {
        return Err(ValidationError::UsernameTooLong);
    }
    if !username.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '-') {
        return Err(ValidationError::UsernameInvalidChars);
    }
    if username.is_inappropriate() {
        return Err(ValidationError::UsernameInappropriate);
    }
    Ok(())
}

pub fn validate_password(password: &str) -> Result<(), ValidationError> {
    if password.len() < 8 {
        return Err(ValidationError::PasswordTooShort);
    }
    if !password.chars().any(|c| c.is_uppercase()) {
        return Err(ValidationError::PasswordNoUppercase);
    }
    if !password.chars().any(|c| c.is_lowercase()) {
        return Err(ValidationError::PasswordNoLowercase);
    }
    if !password.chars().any(|c| c.is_ascii_digit()) {
        return Err(ValidationError::PasswordNoNumber);
    }
    if !password.chars().any(|c| c.is_ascii_punctuation()) {
        return Err(ValidationError::PasswordNoSymbol);
    }
    Ok(())
}
