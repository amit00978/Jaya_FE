# Download these files from Firebase Console

## For iOS:
1. Go to Firebase Console → Project Settings → iOS apps
2. Download GoogleService-Info.plist 
3. Place it in: ios/GoogleService-Info.plist

## For Android:
1. Go to Firebase Console → Project Settings → Android apps  
2. Download google-services.json
3. Place it in: android/app/google-services.json

## Your Firebase Project:
- Project ID: jarvis-backend-dea61
- Package Name (Android): com.anonymous.jivaMobileApp  
- Bundle ID (iOS): com.anonymous.jivaMobileApp

## Steps to Download:

### iOS Setup:
1. Go to https://console.firebase.google.com/
2. Select your project "jarvis-backend-dea61"
3. Click Project Settings (gear icon)
4. Go to "Your apps" section
5. If iOS app doesn't exist, click "Add app" → iOS
6. Enter Bundle ID: com.anonymous.jivaMobileApp
7. Enter App nickname: JARVIS AI Assistant
8. Download GoogleService-Info.plist
9. Place file in: ios/GoogleService-Info.plist

### Android Setup:
1. In same Firebase Console
2. If Android app doesn't exist, click "Add app" → Android
3. Enter package name: com.anonymous.jivaMobileApp
4. Enter App nickname: JARVIS AI Assistant
5. Download google-services.json
6. Place file in: android/app/google-services.json

## After adding files:
eas build --profile development --platform ios
eas build --profile development --platform android