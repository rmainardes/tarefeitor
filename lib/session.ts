// Cookie de seleção de pessoa por dispositivo (seção 8.1).

export const SELECTED_PERSON_COOKIE = "selected_person";

/** 10 anos: "longa duração", até o dispositivo trocar de pessoa. */
export const SELECTED_PERSON_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 10;
