# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.2.2](https://github.com/eodmproductions/model-viewer-vue/compare/v0.2.1...v0.2.2) (2022-10-06)


### Bug Fixes

* add `type` validator to `colors` prop ([2f1020c](https://github.com/eodmproductions/model-viewer-vue/commit/2f1020c9cbe12a58b51eea19d7e0a87f12ee153d))
* annotate `cameraOrbit` custom validator `value` parameter type ([9f4958b](https://github.com/eodmproductions/model-viewer-vue/commit/9f4958bff1825485951153c451ce4befb1205698))
* convert `attemptToAddModelFromPropsToScene` to use `await` ([e331a61](https://github.com/eodmproductions/model-viewer-vue/commit/e331a613ab12614dbb3625a4f68e49864cb28f28))


### Code Refactoring

* invoke `convertSRGBToLinear` on colors in `setColors` ([96205f0](https://github.com/eodmproductions/model-viewer-vue/commit/96205f0406ce322cb85c01bb3a847510ae1f8cf9))

### [0.2.1](https://github.com/eodmproductions/model-viewer-vue/compare/v0.2.0...v0.2.1) (2022-09-20)


### Features

* add `background` prop watcher ([fbb5d21](https://github.com/eodmproductions/model-viewer-vue/commit/fbb5d21e6d38557a5a75073a55d233094fdcb801))


### Bug Fixes

* remove `console.log` from `OrbitControls.dollyOut` ([d3f9d95](https://github.com/eodmproductions/model-viewer-vue/commit/d3f9d95119461cedc45dde93a23ec75d375110fa))

## [0.2.0](https://github.com/eodmproductions/model-viewer-vue/compare/v0.1.3...v0.2.0) (2022-08-30)


### ⚠ BREAKING CHANGES

* rename package to @eodmproductions/model-viewer-vue

### Features

* create `cameraOrbit` prop ([0949f47](https://github.com/eodmproductions/model-viewer-vue/commit/0949f47794645262e8db7f3f5bf44f554b77fad8))


### Code Refactoring

* create and implement `OrbitControls` class ([b3d51c3](https://github.com/eodmproductions/model-viewer-vue/commit/b3d51c33767b2b5a4c947358078c57bb7ed3da9c))


### Build

* rename package to @eodmproductions/model-viewer-vue ([a595730](https://github.com/eodmproductions/model-viewer-vue/commit/a59573046080099517cf87b768b1df01044263fc))

### [0.1.3](https://github.com/eodmproductions/model-viewer-vue/compare/v0.1.2...v0.1.3) (2022-05-26)


### Features

* add a `disableRotate` prop that defaults to `false` ([3663286](https://github.com/eodmproductions/model-viewer-vue/commit/3663286eb69c0dea2c8716a68cef8a7266b8d39c))
* add a `disableZoom` prop that defaults to `false` ([813b727](https://github.com/eodmproductions/model-viewer-vue/commit/813b7276292320642129c88f7399a1fc1f6735fc))

### [0.1.2](https://github.com/eodmproductions/model-viewer-vue/compare/v0.1.1...v0.1.2) (2022-04-04)


### Bug Fixes

* modify `colors` prop to make it optional ([d45c337](https://github.com/eodmproductions/model-viewer-vue/commit/d45c33790d51a89b17e53b589c59f77b4f3e4138))


### Build

* **rollup:** mark three.js dependencies as external ([d44ca8a](https://github.com/eodmproductions/model-viewer-vue/commit/d44ca8a92bf7b19d9266b8f1f886d857b88da544))

### [0.1.1](https://github.com/eodmproductions/model-viewer-vue/compare/v0.1.0...v0.1.1) (2022-03-31)


### Code Refactoring

* replace lights with an environment map ([649a97f](https://github.com/eodmproductions/model-viewer-vue/commit/649a97f53ae74ac40fed63004f7d0373f67cf3d9))

## 0.1.0 (2022-03-20)


### Features

* initial commit ([76872d2](https://github.com/eodmproductions/model-viewer-vue/commit/76872d28bc6df1a38ec375b46dde15f1011843ce))
