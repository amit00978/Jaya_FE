# JARVIS AI Assistant - Notification Setup

## The Issue: Expo Go Limitations

Starting from Expo SDK 53, push notifications are no longer supported in Expo Go. You're getting this error because the notification functionality requires a development build.

## Solutions

### Option 1: Use Development Build (Recommended)
To get full notification functionality, create a development build:

#### For Android:
```bash
# Build and install development build on connected device
npx expo run:android

# Or build using EAS (requires EAS CLI)
npx eas build --platform android --profile development
```

#### For iOS:
```bash
# Build and install development build on connected device/simulator
npx expo run:ios

# Or build using EAS (requires EAS CLI)
npx eas build --platform ios --profile development
```

### Option 2: Temporary Testing with Expo Go
The app now gracefully handles Expo Go limitations:
- ✅ Reminders are saved locally
- ⚠️ No push notifications (but you'll see a helpful message)
- 📱 All other features work normally

## Features Available

### In Development Build:
- ✅ Real push notifications
- ✅ System alarm integration
- ✅ Background notification scheduling
- ✅ All JARVIS features

### In Expo Go:
- ✅ Local reminder storage
- ✅ Voice recognition
- ✅ Chat functionality
- ⚠️ No push notifications (saved locally only)

## How to Create Development Build

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g @expo/cli@latest eas-cli
   ```

2. **Login to Expo**:
   ```bash
   npx expo login
   ```

3. **Build for your platform**:
   ```bash
   # For Android
   npx expo run:android
   
   # For iOS (requires Xcode)
   npx expo run:ios
   ```

4. **Install on your device** and enjoy full notification functionality!

## What's Different in Development Build

- 🔔 **Real Notifications**: Get actual push notifications
- ⏰ **System Integration**: Integrates with phone's alarm system
- 🔊 **Sound & Vibration**: Full notification experience
- 📱 **Background**: Notifications work even when app is closed

## Testing the Feature

Once you have a development build, try saying:
- "Remind me to call mom in 30 minutes"
- "Set an alarm for 2:30 PM"
- "Remind me about the meeting in 2 hours"

## Need Help?

If you encounter issues:
1. Make sure you have a physical device connected
2. For iOS: Ensure you have Xcode installed
3. For Android: Enable developer mode and USB debugging
4. Check that your development environment is properly set up

The notification feature has been designed to work seamlessly across both platforms with proper development builds! 🚀