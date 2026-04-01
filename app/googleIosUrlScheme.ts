/**
 * Google iOS OAuth clients use a reversed custom URL scheme derived from the client id.
 * Same value as in Google Cloud → iOS client → URL scheme.
 *
 * Also duplicated in `app.config.ts` (Expo cannot import this file when loading config).
 *
 * @see https://developers.google.com/identity/sign-in/ios/start-integrating
 */
export function googleIosUrlSchemeFromClientId(clientId: string): string {
  const suffix = '.apps.googleusercontent.com';
  if (!clientId || !clientId.endsWith(suffix)) {
    return '';
  }
  const idPart = clientId.slice(0, -suffix.length);
  return `com.googleusercontent.apps.${idPart}`;
}
