(function (global) {
  'use strict';

  const KINDS = ['kpass-child', 'dcas-teen', 'dcas-adult'];
  const LOCALES = ['ko','en','ja','zh','es','ru','vi','th','ar','it','az','km'];

  function finiteNumber(value, field) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(field + ' must be a finite number');
    }
    return value;
  }

  function integer(value, field, min) {
    finiteNumber(value, field);
    if (!Number.isInteger(value) || value < min) throw new RangeError(field + ' is invalid');
    return value;
  }

  function text(value, field, optional) {
    if (optional && (value === undefined || value === null || value === '')) return undefined;
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(field + ' must be a non-empty string');
    return value.trim();
  }

  function validateDate(date) {
    if (!date || typeof date !== 'object') throw new TypeError('test.date is required');
    const y = integer(date.y, 'test.date.y', 1900);
    const m = integer(date.m, 'test.date.m', 1);
    const d = integer(date.d, 'test.date.d', 1);
    if (m > 12 || d > 31) throw new RangeError('test.date is invalid');
    const actual = new Date(Date.UTC(y, m - 1, d));
    if (actual.getUTCFullYear() !== y || actual.getUTCMonth() !== m - 1 || actual.getUTCDate() !== d) {
      throw new RangeError('test.date is invalid');
    }
    return { y:y, m:m, d:d };
  }

  function validateScores(kind, scores) {
    if (!scores || typeof scores !== 'object') throw new TypeError('scores is required');
    const max = kind === 'kpass-child' ? 160 : 100;
    const normalized = {};
    ['P','A','S','Q'].forEach(function (axis) {
      const value = finiteNumber(scores[axis], 'scores.' + axis);
      if (value < 0 || value > max) throw new RangeError('scores.' + axis + ' must be between 0 and ' + max);
      normalized[axis] = value;
    });
    if (kind === 'kpass-child') {
      const fullScale = finiteNumber(scores.fullScale, 'scores.fullScale');
      if (fullScale < 0 || fullScale > 160) throw new RangeError('scores.fullScale must be between 0 and 160');
      normalized.fullScale = fullScale;
    }
    return normalized;
  }

  function normalize(payload) {
    if (!payload || typeof payload !== 'object') throw new TypeError('payload is required');
    if (payload.schemaVersion !== 1) throw new RangeError('unsupported schemaVersion');
    const kind = text(payload.reportKind, 'reportKind');
    if (!KINDS.includes(kind)) throw new RangeError('unsupported reportKind');
    const person = payload.person || {};
    const genderKey = text(person.genderKey, 'person.genderKey');
    if (!['M','F','X'].includes(genderKey)) throw new RangeError('person.genderKey must be M, F, or X');
    const locale = text(payload.locale || 'ko', 'locale').toLowerCase().replaceAll('_','-');
    if (!LOCALES.includes(locale.split('-')[0])) throw new RangeError('unsupported locale');
    const ageMonths = integer(person.ageMonths || 0, 'person.ageMonths', 0);
    if (ageMonths > 11) throw new RangeError('person.ageMonths must be between 0 and 11');
    return {
      schemaVersion: 1,
      reportKind: kind,
      locale: locale,
      person: {
        fullName: text(person.fullName, 'person.fullName'),
        givenName: text(person.givenName || person.fullName, 'person.givenName'),
        fullNameEn: text(person.fullNameEn, 'person.fullNameEn', true),
        genderKey: genderKey,
        ageYears: integer(person.ageYears, 'person.ageYears', 0),
        ageMonths: ageMonths,
        gradeLabel: text(person.gradeLabel, 'person.gradeLabel', kind === 'kpass-child'),
        majorName: text(person.majorName, 'person.majorName', kind !== 'dcas-adult')
      },
      test: { date: validateDate(payload.test && payload.test.date) },
      scores: validateScores(kind, payload.scores)
    };
  }

  function toLegacyProfile(input) {
    const p = input.person;
    const s = input.scores;
    if (input.reportKind === 'kpass-child') {
      return {
        name: p.fullName,
        genderKey: p.genderKey,
        ageYears: p.ageYears,
        ageMonths: p.ageMonths,
        testDate: input.test.date,
        fullScaleScore: s.fullScale,
        scores: { P:s.P, A:s.A, S:s.S, Q:s.Q }
      };
    }
    return {
      fullName: p.fullName,
      givenName: p.givenName,
      fullNameEn: p.fullNameEn,
      genderKey: p.genderKey,
      ageYears: p.ageYears,
      gradeLabel: p.gradeLabel,
      majorName: p.majorName,
      testDate: input.test.date,
      scores: { P:s.P, A:s.A, S:s.S, Q:s.Q }
    };
  }

  function install(payload) {
    const normalized = normalize(payload);
    global.__RESULT_REPORT_PAYLOAD__ = normalized;
    global.__TEST_PROFILE__ = toLegacyProfile(normalized);
    global.__REPORT_LOCALE__ = normalized.locale;
    global.__DCAS_LANG__ = normalized.locale;
    return normalized;
  }

  global.ResultReportAdapter = {
    KINDS: KINDS.slice(),
    LOCALES: LOCALES.slice(),
    normalize: normalize,
    toLegacyProfile: toLegacyProfile,
    install: install
  };
})(typeof window !== 'undefined' ? window : globalThis);
