export interface AuthResponse {
  userId: string
  token: string
  refreshToken: string
}

export enum OAuthProvider {
  GOOGLE = 'google',
  TWITTER = 'twitter',
  APPLE = 'apple',
  FACEBOOK = 'facebook',
  DISCORD = 'discord',
  LINE = 'line',
}
