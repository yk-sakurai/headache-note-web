import {
  DOSAGE_PATTERN,
  MAX_MEDICATION_NAME_LENGTH,
  MAX_MEDICATION_UNIT_LENGTH,
  MAX_MULTI_TEXT_LENGTH,
} from "@/lib/headache-log-constraints";
import {
  createMedicationSuggestionValue,
  createTextSuggestionValue,
  normalizeSuggestionText,
  type EditableRawInput,
  type SuggestionFieldKey,
  type SuggestionValue,
} from "./suggestion-types";

export type SuggestionInputField = "text" | "name" | "dosage" | "unit";
export type SuggestionInputErrors = Partial<Record<SuggestionInputField, string>>;

export type SuggestionDraftInput = {
  text: string;
  name: string;
  dosage: string;
  unit: string;
};

export const EMPTY_SUGGESTION_DRAFT: SuggestionDraftInput = {
  text: "",
  name: "",
  dosage: "",
  unit: "",
};

export const DOSAGE_FORMAT_MESSAGE = "用量は小数2桁までの数値で入力してください";

const lengthMessage = (max: number) => `${max}文字以内で入力してください`;

/**
 * 通常テキスト候補の検証。
 * モバイルに合わせ、生の入力値で必須・文字数（UTF-16 コード単位）を判定し、
 * そのあと正規化後に空にならないかを確認する。
 */
export const validateSuggestionText = (rawText: string): SuggestionInputErrors => {
  if (rawText.length === 0) {
    return { text: "入力してください" };
  }
  if (rawText.length > MAX_MULTI_TEXT_LENGTH) {
    return { text: lengthMessage(MAX_MULTI_TEXT_LENGTH) };
  }
  if (!normalizeSuggestionText(rawText)) {
    return { text: "入力してください" };
  }
  return {};
};

/** 用量の書式検証。0 を許可し、負数・指数表記・小数3桁以上・非数値を拒否する。 */
export const validateSuggestionDosage = (rawDosage: string): string | undefined => {
  if (rawDosage.length === 0) {
    return "用量を入力してください";
  }
  if (!DOSAGE_PATTERN.test(rawDosage)) {
    return DOSAGE_FORMAT_MESSAGE;
  }
  if (!Number.isFinite(Number(rawDosage))) {
    return DOSAGE_FORMAT_MESSAGE;
  }
  return undefined;
};

/** 服薬候補の検証。薬名・用量・単位のフィールド別エラーを返す。 */
export const validateSuggestionMedication = ({
  name,
  dosage,
  unit,
}: {
  name: string;
  dosage: string;
  unit: string;
}): SuggestionInputErrors => {
  const errors: SuggestionInputErrors = {};

  if (name.length === 0) {
    errors.name = "薬名を入力してください";
  } else if (name.length > MAX_MEDICATION_NAME_LENGTH) {
    errors.name = lengthMessage(MAX_MEDICATION_NAME_LENGTH);
  } else if (!normalizeSuggestionText(name)) {
    errors.name = "薬名を入力してください";
  }

  const dosageError = validateSuggestionDosage(dosage);
  if (dosageError) {
    errors.dosage = dosageError;
  }

  if (unit.length === 0) {
    errors.unit = "単位を入力してください";
  } else if (unit.length > MAX_MEDICATION_UNIT_LENGTH) {
    errors.unit = lengthMessage(MAX_MEDICATION_UNIT_LENGTH);
  } else if (!normalizeSuggestionText(unit)) {
    errors.unit = "単位を入力してください";
  }

  return errors;
};

export const validateSuggestionDraft = (
  fieldKey: SuggestionFieldKey,
  draft: SuggestionDraftInput
): SuggestionInputErrors => {
  if (fieldKey === "medications") {
    return validateSuggestionMedication({
      name: draft.name,
      dosage: draft.dosage,
      unit: draft.unit,
    });
  }
  return validateSuggestionText(draft.text);
};

export const hasSuggestionInputErrors = (errors: SuggestionInputErrors) =>
  Object.keys(errors).length > 0;

/**
 * 検証を通った下書きから候補値を作る。
 * 検証を通っていれば null にはならないが、呼び出し側で null を黙って無視しないこと。
 */
export const buildSuggestionValueFromDraft = (
  fieldKey: SuggestionFieldKey,
  draft: SuggestionDraftInput
): SuggestionValue | null => {
  if (fieldKey === "medications") {
    return createMedicationSuggestionValue({
      name: draft.name,
      dosage: draft.dosage,
      unit: draft.unit,
    });
  }
  return createTextSuggestionValue(draft.text);
};

/** 既存候補の生値を編集用の下書き入力へ戻す。 */
export const rawInputToDraft = (rawInput: EditableRawInput): SuggestionDraftInput => {
  if (rawInput.type === "medication") {
    return {
      text: "",
      name: rawInput.name,
      dosage: typeof rawInput.dosage === "number" ? String(rawInput.dosage) : rawInput.dosage,
      unit: rawInput.unit,
    };
  }
  return { text: rawInput.text, name: "", dosage: "", unit: "" };
};

/**
 * 既存候補の生値に対する入力制約の診断。
 * 非表示の候補も対象にし、違反があれば画面全体の保存をブロックする。
 * 数値用量は有限性・非負・小数桁を `String(dosage)` の表記で検査する
 * （元の `1.0` の綴りは数値から復元できない）。
 */
export const validateRawInputConstraints = (
  rawInput: EditableRawInput
): SuggestionInputErrors => {
  if (rawInput.type === "text") {
    return validateSuggestionText(rawInput.text);
  }

  const dosageText =
    typeof rawInput.dosage === "number" ? String(rawInput.dosage) : rawInput.dosage;

  return validateSuggestionMedication({
    name: rawInput.name,
    dosage: dosageText,
    unit: rawInput.unit,
  });
};
