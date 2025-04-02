# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.36] - 2025-04-02
### Fix
- eip 1193 provider sign message

## [0.8.35] - 2025-04-01
### Chore
- update auth methods

## [0.8.34] - 2025-04-01
### Chore
- update openapi code generation

## [0.8.33] - 2025-03-31
### Fix
- validate credentials for non browser apps

## [0.8.32] - 2025-03-21
### Feat
- reduce size SDK

## [0.8.31] - 2025-03-12
### Fix
- error handling eth_sendTransaction

## [0.8.30] - 2025-03-10
### Feat
- tree shacking for better bundle size

## [0.8.29] - 2025-03-10
### Feat
- improve error handling

## [0.8.28] - 2025-02-25
### Feat
- add eth_estimateGas to EVMProvider

## [0.8.27] - 2025-02-19
### Feat
- error handling improvements in EIP-1193

## [0.8.25] - 2025-02-07
### Feat
- logout on revoke

## [0.8.24] - 2025-02-07
### Fix
- Revoke session

## [0.8.23] - 2025-02-07
### Feat
- return client type and connector type

## [0.8.22] - 2025-02-06
### Fix
- switch chain
- wrong password for recovery types

## [0.8.15] - 2024-12-31
### Feat
- Support for platforms not using crypto
- Support for ownerAddress returned on getAccount

## [0.8.13] - 2024-11-26
### Feat
- Add support for ERC-7715 and EIP-5792
- Add new zkSync smart accounts

## [0.8.12] - 2024-10-31
### Added
- Link Third Party Auth Provider

## [0.8.11] - 2024-10-23
### Added
- Support for new chains

## [0.8.10] - 2024-09-27
### Added
- Telegram Mini App auth provider

## [0.8.9] - 2024-09-27
### Added
- Telegram auth provider

## [0.8.8] - 2024-09-27
### Add
- Update reference

## [0.8.7] - 2024-08-12
### Add
- Set recovery method for embedded signer

## [0.8.6] - 2024-07-29
### Fix
- Singleton iframe Manager

## [0.8.5] - 2024-07-29
### Fix
- Fix error handling for ecosystems

## [0.8.4] - 2024-07-26
### Fix
- Update authentication without signout

## [0.8.3] - 2024-07-26
### Feat
- Add getAccount method

## [0.8.2] - 2024-07-25
### Fix
- Remove redundant auth delete

## [0.8.1] - 2024-07-24
### Fix
- Player mismatch on login logs out the current player

## [0.7.26] - 2024-07-19
### Added
- et_accounts also initializes the address and signer

## [0.7.25] - 2024-07-19
### Added
- Allow for getEthereumProvider without configured embedded signer

## [0.7.24] - 2024-07-19
### Added
- Pass player id through configure request

## [0.7.23] - 2024-07-19
### Fixed
- Rollback to previous version

## [0.7.22] - 2024-07-18
### Updated
- Do not cache device id

## [0.7.21] - 2024-07-18
### Fixed
- Handle missing project entropy

## [0.7.20] - 2024-07-18
### Fixed
- AccountType to shieldAuthType type mismatch

## [0.7.19] - 2024-07-16
### Fixed
- Handle export private key response

## [0.7.18] - 2024-07-16
### Fixed
- Encrypt session support

## [0.7.17] - 2024-07-15
### Added
- Added encryption session support
- Export private key
- Flush signer when missing recovery password

## [0.7.16] - 2024-07-15
### Fix
- Refresh token when using third party auth

## [0.7.15] - 2024-07-05
### Added
- Openfort ecosystems support

## [0.7.14] - 2024-07-03
### Added
- Update internal openapi code generation

## [0.7.13] - 2024-06-25
### Fixed
- Missing Token Type and Auth Provider on Shield Authentication

## [0.7.12] - 2024-06-21
### Added
- Support for Discord and Epic Games OAuth

## [0.7.11] - 2024-06-20
### Fix
- Fix refresh token when using openfort auth

## [0.7.10] - 2024-06-20
### Fix
- Fix SDK configuration

## [0.7.9] - 2024-06-20
### Fix
- Fix Shield authentication

## [0.7.8] - 2024-06-11
### Added
- Add new linking/unlink methods

## [0.7.7] - 2024-06-04
### Added
- Add new linking methods

## [0.7.6] - 2024-06-01
### Added
- Verified email support and update reference

## [0.7.5] - 2024-05-31
### Added
- Support for password reset and email verification
- Auth sample
 
## [0.7.4] - 2024-05-31
### Added
- Facebook login support

## [0.7.3] - 2024-05-31
### Added
- Add export of EIP-1193 provider


## [0.7.2] - 2024-05-31
### Added
- Add new authentication endpoints with openfort


## [0.7.1] - 2024-05-29
### Fix
- Add missing rollup configuration for the SDK with openapi code generation


## [0.7.0] - 2024-05-28
### Feat
- Automatic code generation from openapi spec
- Changed the way the SDK is initialized
- More consistent error handling
- User entropy and automatic recovery using same method
