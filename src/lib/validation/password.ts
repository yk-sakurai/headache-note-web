export const PASSWORD_ERROR_MESSAGES = {
  required: "パスワードを入力してください。",
  minLength: "パスワードは8文字以上にしてください。",
  maxLength: "パスワードは32文字以下にしてください。",
  lowercase: "パスワードには少なくとも1つ以上の小文字を含めてください。",
  uppercase: "パスワードには少なくとも1つ以上の大文字を含めてください。",
  number: "パスワードには少なくとも1つ以上の数字を含めてください。",
  invalidCharacters: "パスワードには_以外の特殊文字は使用できません。",
} as const;

export const SIGNUP_FORM_ERROR_MESSAGES = {
  invalidInput: "入力内容に誤りがあります。",
  passwordMismatch: "パスワードが一致しません。",
  agreementRequired: "利用規約・プライバシーポリシーを確認してください。",
} as const;

export function validatePassword(value: string): string | null {
  if (!value) {
    return PASSWORD_ERROR_MESSAGES.required;
  }

  if (value.length < 8) {
    return PASSWORD_ERROR_MESSAGES.minLength;
  }

  if (value.length > 32) {
    return PASSWORD_ERROR_MESSAGES.maxLength;
  }

  if (!/[a-z]/.test(value)) {
    return PASSWORD_ERROR_MESSAGES.lowercase;
  }

  if (!/[A-Z]/.test(value)) {
    return PASSWORD_ERROR_MESSAGES.uppercase;
  }

  if (!/[0-9]/.test(value)) {
    return PASSWORD_ERROR_MESSAGES.number;
  }

  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    return PASSWORD_ERROR_MESSAGES.invalidCharacters;
  }

  return null;
}
