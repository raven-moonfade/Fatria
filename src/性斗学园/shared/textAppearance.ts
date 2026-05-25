export const TEXT_APPEARANCE_CONFIG_KEY = '正文美化配置';
export const DEFAULT_TEXT_COLOR = '#f3f4f6';

export interface TextAppearanceConfig {
  字体颜色?: string;
}

function readVariables(option: VariableOption): Record<string, any> {
  try {
    const globalAny = window as any;
    if (typeof globalAny.getVariables === 'function') {
      return globalAny.getVariables(option);
    }
  } catch (error) {
    console.warn('[性斗学园] 读取变量失败:', option, error);
  }
  return {};
}

export function getTextAppearanceConfig(): TextAppearanceConfig {
  const characterConfig = readVariables({ type: 'character' })[TEXT_APPEARANCE_CONFIG_KEY] || {};
  const chatConfig = readVariables({ type: 'chat' })[TEXT_APPEARANCE_CONFIG_KEY] || {};
  const baseConfig = chatConfig && typeof chatConfig === 'object' ? chatConfig : {};
  const overrideConfig = characterConfig && typeof characterConfig === 'object' ? characterConfig : {};
  return { ...baseConfig, ...overrideConfig };
}

export function getSharedTextColor(): string {
  const color = getTextAppearanceConfig().字体颜色;
  return typeof color === 'string' && color.trim() ? color.trim() : DEFAULT_TEXT_COLOR;
}

export function saveTextAppearanceConfig(config: Record<string, any>): void {
  const globalAny = window as any;
  if (typeof globalAny.insertOrAssignVariables === 'function') {
    globalAny.insertOrAssignVariables({ [TEXT_APPEARANCE_CONFIG_KEY]: config }, { type: 'character' });
  }
}
