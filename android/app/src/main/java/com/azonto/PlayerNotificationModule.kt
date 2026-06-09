package com.azonto

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.os.Build
import android.widget.RemoteViews
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class PlayerNotificationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val channelId = "azonto_player"
  private val notificationId = 202
  private val actionPrevious = "com.azonto.PLAYER_PREVIOUS"
  private val actionToggle = "com.azonto.PLAYER_TOGGLE"
  private val actionNext = "com.azonto.PLAYER_NEXT"

  private val receiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      val action = when (intent?.action) {
        actionPrevious -> "previous"
        actionToggle -> "toggle"
        actionNext -> "next"
        else -> return
      }

      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("AzontoPlayerNotificationAction", action)
    }
  }

  init {
    val filter = IntentFilter().apply {
      addAction(actionPrevious)
      addAction(actionToggle)
      addAction(actionNext)
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      reactContext.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
    } else {
      reactContext.registerReceiver(receiver, filter)
    }
  }

  override fun getName(): String = "PlayerNotification"

  private fun ensureChannel(manager: NotificationManager) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val channel = NotificationChannel(
      channelId,
      "Lecteur Azonto",
      NotificationManager.IMPORTANCE_LOW
    )
    manager.createNotificationChannel(channel)
  }

  private fun actionIntent(action: String, requestCode: Int): PendingIntent {
    val intent = Intent(action).setPackage(reactContext.packageName)
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getBroadcast(reactContext, requestCode, intent, flags)
  }

  private fun contentIntent(): PendingIntent {
    val intent = Intent(reactContext, MainActivity::class.java).apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getActivity(reactContext, 4, intent, flags)
  }

  private fun playerView(
    title: String,
    artist: String,
    safePosition: Int,
    safeDuration: Int,
    isPlaying: Boolean
  ): RemoteViews {
    return RemoteViews(reactContext.packageName, R.layout.notification_player).apply {
      setTextViewText(R.id.notificationTitle, title)
      setTextViewText(R.id.notificationArtist, artist)
      setImageViewResource(
        R.id.notificationToggle,
        if (isPlaying) R.drawable.ic_azonto_pause else R.drawable.ic_azonto_play
      )
      setProgressBar(
        R.id.notificationProgress,
        safeDuration.coerceAtLeast(1),
        safePosition,
        safeDuration <= 0
      )
      setOnClickPendingIntent(
        R.id.notificationPrevious,
        actionIntent(actionPrevious, 1)
      )
      setOnClickPendingIntent(
        R.id.notificationToggle,
        actionIntent(actionToggle, 2)
      )
      setOnClickPendingIntent(
        R.id.notificationNext,
        actionIntent(actionNext, 3)
      )
    }
  }

  @ReactMethod
  fun show(
    title: String,
    artist: String,
    position: Double,
    duration: Double,
    isPlaying: Boolean
  ) {
    val manager =
      reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    ensureChannel(manager)

    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Notification.Builder(reactContext, channelId)
    } else {
      Notification.Builder(reactContext)
    }

    val safeDuration = duration.toInt().coerceAtLeast(0)
    val safePosition = position.toInt().coerceIn(0, safeDuration.coerceAtLeast(1))
    val customView = playerView(title, artist, safePosition, safeDuration, isPlaying)

    builder
      .setSmallIcon(R.drawable.ic_azonto_notification)
      .setContentTitle(title)
      .setContentText(artist)
      .setSubText("Azonto")
      .setContentIntent(contentIntent())
      .setOngoing(isPlaying)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setColor(Color.rgb(255, 122, 8))
      .setCategory(Notification.CATEGORY_TRANSPORT)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setProgress(safeDuration, safePosition, safeDuration <= 0)
      .setCustomContentView(customView)
      .setCustomBigContentView(customView)
      .setStyle(Notification.DecoratedCustomViewStyle())

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      builder.setColorized(true)
    }

    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      builder.setPriority(Notification.PRIORITY_HIGH)
    }

    val notification = builder.build()

    manager.notify(notificationId, notification)
  }

  @ReactMethod
  fun hide() {
    val manager =
      reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.cancel(notificationId)
  }
}
