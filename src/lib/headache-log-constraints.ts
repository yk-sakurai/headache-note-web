/**
 * 頭痛記録フォームと入力候補編集で共有する入力制約の定数。
 *
 * モバイル（headache_log_constants.dart）と同じ値を使う。
 * 共有するのは定数のみで、判定順序（trim の有無など）は各画面の仕様に従う。
 */

/** 痛みの場所・痛み方・トリガー・併発症状・対処の文字数上限 */
export const MAX_MULTI_TEXT_LENGTH = 50;

/** 対処の内容の文字数上限（通常テキストと同じ） */
export const MAX_ACTION_TEXT_LENGTH = 50;

/** 薬名の文字数上限 */
export const MAX_MEDICATION_NAME_LENGTH = 30;

/** 単位の文字数上限 */
export const MAX_MEDICATION_UNIT_LENGTH = 10;

/** メモの文字数上限（Web 独自。モバイルには対応する候補欄がない） */
export const MAX_NOTE_LENGTH = 500;

/** 用量の入力書式。0 を許可し、小数は2桁まで。 */
export const DOSAGE_PATTERN = /^\d+(\.\d{1,2})?$/;

/** 手動候補の保存上限 */
export const MANUAL_SAVE_LIMIT = 20;

/** 手動候補の記録フォームでの表示上限 */
export const MANUAL_DISPLAY_LIMIT = 7;

/** 自動候補の記録フォームでの表示上限 */
export const AUTO_DISPLAY_LIMIT = 2;

/** 自動候補の既定 order に加算するオフセット（モバイルと同じ） */
export const AUTO_ORDER_OFFSET = 100;
