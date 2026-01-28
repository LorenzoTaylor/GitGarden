// Color groups for different body/clothing parts
export const colorGroups = {
    skin: ['body', 'head', 'face', 'ears', 'arms'],
    hair: ['hairA', 'hairB', 'hairC', 'hairD', 'eyebrows'],
    eyes: ['eyes'],
    topA: ['topA'],
    topB: ['topB'],
    bottomA: ['bottomA'],
    bottomB: ['bottomB'],
    shoes: ['shoes'],
    socks: ['socks'],
    gloves: ['gloves'],
    jacketA: ['jacketA'],
    jacketB: ['jacketB'],
    accessoryA: ['accessoryA'],
    accessoryB: ['accessoryB'],
    accessoryC: ['accessoryC'],
    accessoryD: ['accessoryD'],
} as const;

export type ColorGroupKey = keyof typeof colorGroups;

export const defaultColors: Record<ColorGroupKey, string> = {
    skin: '#e8b89d',
    hair: '#4a3728',
    eyes: '#3d85c6',
    topA: '#c45c5c',
    topB: '#8b3a3a',
    bottomA: '#4a5568',
    bottomB: '#2d3748',
    shoes: '#1a1a1a',
    socks: '#ffffff',
    gloves: '#654321',
    jacketA: '#2563eb',
    jacketB: '#1d4ed8',
    accessoryA: '#fbbf24',
    accessoryB: '#f59e0b',
    accessoryC: '#d97706',
    accessoryD: '#b45309',
};

export const skinTones = [
    { name: 'Light', color: '#fde7d9' },
    { name: 'Peach', color: '#e8b89d' },
    { name: 'Medium', color: '#c49a6c' },
{ name: 'Tan', color: '#9b6b43' },
    { name: 'Brown', color: '#5c3d2e' },
    { name: 'Dark', color: '#3b2219' },
];

// Preset hair colors
export const hairColors = [
    { name: 'Black', color: '#1a1a1a' },
    { name: 'Brown', color: '#4a3728' },
    { name: 'Blonde', color: '#d4a853' },
    { name: 'Red', color: '#8b3a3a' },
    { name: 'Gray', color: '#9ca3af' },
    { name: 'White', color: '#f5f5f5' },
];

// Preset eye colors
export const eyeColors = [
    { name: 'Blue', color: '#3d85c6' },
    { name: 'Green', color: '#4ade80' },
    { name: 'Brown', color: '#78350f' },
    { name: 'Hazel', color: '#a3763d' },
    { name: 'Gray', color: '#6b7280' },
    { name: 'Violet', color: '#8b5cf6' },
];

// General color palette for clothing
export const clothingColors = [
    { name: 'Red', color: '#c45c5c' },
    { name: 'Blue', color: '#2563eb' },
    { name: 'Green', color: '#22c55e' },
    { name: 'Yellow', color: '#fbbf24' },
    { name: 'Purple', color: '#8b5cf6' },
    { name: 'Orange', color: '#f97316' },
    { name: 'Pink', color: '#ec4899' },
    { name: 'Teal', color: '#14b8a6' },
    { name: 'Black', color: '#1a1a1a' },
    { name: 'White', color: '#f5f5f5' },
    { name: 'Gray', color: '#6b7280' },
    { name: 'Brown', color: '#78350f' },
];

// Helper to get color for a layer
export const getColorForLayer = (layerKey: string, colors: Record<ColorGroupKey, string>): string | null => {
    for (const [groupKey, layers] of Object.entries(colorGroups)) {
        if (layers.includes(layerKey)) {
            return colors[groupKey as ColorGroupKey];
        }
    }
    return null; // Non-colorable layers (tools, back items, etc.)
};

// Helper to get color group key for a layer (e.g., 'body' -> 'skin', 'hairA' -> 'hair')
export const getColorGroupForLayer = (layerKey: string): ColorGroupKey | null => {
    for (const [groupKey, layers] of Object.entries(colorGroups)) {
        if ((layers as readonly string[]).includes(layerKey)) {
            return groupKey as ColorGroupKey;
        }
    }
    return null;
};
