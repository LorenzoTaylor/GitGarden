use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub github_username: String,
    pub current_character: Option<Character>,
    pub characters: Vec<Character>,
    pub stats: JsonValue,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Character {
    pub id: String,
    pub name: String,
    pub body: ClothingItem,
    pub head: ClothingItem,
    pub face: ClothingItem,
    pub ears: ClothingItem,
    pub horns: ClothingItem,
    pub arms: ClothingItem,
    pub eyes: ClothingItem,
    pub eyebrows: ClothingItem,
    pub hair_a: ClothingItem, // Front Hair
    pub hair_b: ClothingItem, // Back Hair
    pub hair_c: ClothingItem, // Side Hair
    pub hair_d: ClothingItem, // Bangs
    pub top_a: ClothingItem,  // Shirt
    pub top_b: ClothingItem,  // Undershirt
    pub mid: ClothingItem,    // Vest
    pub jacket_a: ClothingItem, // Jacket
    pub jacket_b: ClothingItem, // Coat
    pub shoulder_a: ClothingItem, // Pauldrons
    pub shoulder_b: ClothingItem, // Cape
    pub bottom_a: ClothingItem, // Pants
    pub bottom_b: ClothingItem, // Shorts
    pub shoes: ClothingItem,
    pub socks: ClothingItem,
    pub gloves: ClothingItem,
    pub accessory_a: ClothingItem, // Eyewear
    pub accessory_b: ClothingItem, // Hat
    pub accessory_c: ClothingItem, // Necklace
    pub accessory_d: ClothingItem, // Earrings
    pub back_a: ClothingItem, // Wings
    pub back_b: ClothingItem, // Backpack
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClothingItem {
    pub asset_id: String,
    pub color: String,
}
