use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Outfit {
    pub id: Uuid,
    pub clothes: JsonValue,
    pub colors: JsonValue,
}

#[derive(Debug, Deserialize)]
pub struct CreateOutfitRequest {
    pub clothes: JsonValue,
    pub colors: JsonValue,
}

#[derive(Debug, Serialize)]
pub struct CreateOutfitResponse {
    pub id: Uuid,
}
