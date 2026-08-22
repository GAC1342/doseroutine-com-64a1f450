export declare const HEAD_CHILD_BUDGET: number;

export declare function headInner(html: string): string;

export declare function countHeadChildren(html: string): number;

export declare function checkHeadBudget(
  path: string,
  html: string,
  budget?: number,
): { path: string; count: number; ok: boolean; message: string };
