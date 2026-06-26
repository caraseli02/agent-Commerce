export default defineEventHandler(async (_event) => {
  const config = useRuntimeConfig();

  return {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectID,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessageSenderID,
    appId: config.public.firebaseAppID,
    measurementId: config.public.firebaseMeasurementID,
  };
});
