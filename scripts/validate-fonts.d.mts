export interface FontContract {
  family: string;
  package: string;
  weights: number[];
  subsets: string[];
  preloadSubsets: string[];
  fontDisplay: string;
  disallowedBundledFamilies: string[];
}

export interface FontValidationInfo {
  fontImports: string[];
  faces: { css: string; family: string; weight: number; display: string }[];
  loadedWeights: number[];
  preloadImports: string[];
  derivedPreloads: string[];
  preloadLinkCount: number;
  classOffenders: string[];
}

export declare const FONT_CONTRACT: FontContract;
export interface FontFace {
  cssPath: string;
  family: string;
  weight: number;
  display: string;
  srcs: string[];
}

export declare function deriveCriticalPreloads(
  faces: FontFace[],
  contract?: FontContract,
): string[];
export declare function runFontValidation(): { errors: string[]; info: FontValidationInfo };
