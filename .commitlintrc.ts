import type {UserConfig} from '@commitlint/types';

const Configuration: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [2, 'always', 72],
    'header-max-length': [2, 'always', 72],
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'release',
        'revert',
        'style',
        'test'
      ]
    ],
    'scope-enum': [
      1,
      'always',
      [
        // Dev app
        'dev',

        // Build
        'rollup',
        'webpack',

        // Chores
        'eslint'
      ]
    ]
  }
}

export default Configuration;
