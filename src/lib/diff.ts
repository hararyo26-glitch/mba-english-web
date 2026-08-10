export type DiffTokenType = "correct" | "missing" | "wrong";

export interface DiffToken {
  type: DiffTokenType;
  text: string;
}

function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9']/g, "");
}

/**
 * 正解文とユーザー入力を単語単位で比較し、LCS(最長共通部分列)ベースでdiffを生成する。
 * - correct: 一致した単語
 * - missing: 正解文にあるがユーザーが入力しなかった単語(抜け漏れ)
 * - wrong: ユーザーが入力したが正解文と一致しない単語(誤字・余分な語)
 */
export function diffWords(correctText: string, userText: string): DiffToken[] {
  const correctWords = correctText.trim().split(/\s+/).filter(Boolean);
  const userWords = userText.trim().split(/\s+/).filter(Boolean);
  const n = correctWords.length;
  const m = userWords.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (normalize(correctWords[i]) === normalize(userWords[j]) && normalize(correctWords[i]) !== "") {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const tokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (normalize(correctWords[i]) === normalize(userWords[j]) && normalize(correctWords[i]) !== "") {
      tokens.push({ type: "correct", text: correctWords[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      tokens.push({ type: "missing", text: correctWords[i] });
      i++;
    } else {
      tokens.push({ type: "wrong", text: userWords[j] });
      j++;
    }
  }
  while (i < n) {
    tokens.push({ type: "missing", text: correctWords[i] });
    i++;
  }
  while (j < m) {
    tokens.push({ type: "wrong", text: userWords[j] });
    j++;
  }

  return tokens;
}

export function isPerfectMatch(tokens: DiffToken[]): boolean {
  return tokens.length > 0 && tokens.every((t) => t.type === "correct");
}
