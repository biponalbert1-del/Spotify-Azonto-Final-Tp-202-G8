package com.azonto

import android.content.ContentValues
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class RingtoneModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "RingtoneTools"

  private fun copyRawResource(source: String, target: File) {
    val resourceId = reactContext.resources.getIdentifier(source, "raw", reactContext.packageName)
    if (resourceId == 0) {
      throw IllegalArgumentException("Source audio introuvable")
    }

    reactContext.resources.openRawResource(resourceId).use { input ->
      target.outputStream().use { output -> input.copyTo(output) }
    }
  }

  private fun copyFileSource(source: String, target: File) {
    File(source.removePrefix("file://")).inputStream().use { input ->
      target.outputStream().use { output -> input.copyTo(output) }
    }
  }

  @ReactMethod
  fun setRingtone(title: String, source: String, promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.System.canWrite(reactContext)) {
        val intent = Intent(
          Settings.ACTION_MANAGE_WRITE_SETTINGS,
          Uri.parse("package:${reactContext.packageName}")
        )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
        promise.reject("WRITE_SETTINGS_REQUIRED", "Autorise Azonto a modifier les reglages systeme.")
        return
      }

      val safeName = title.replace(Regex("[^A-Za-z0-9_-]"), "_").ifBlank { "azonto" }
      val target = File(reactContext.cacheDir, "$safeName-ringtone.mp3")

      if (source.startsWith("/") || source.startsWith("file://")) {
        copyFileSource(source, target)
      } else {
        copyRawResource(source, target)
      }

      val values = ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, "$safeName.mp3")
        put(MediaStore.MediaColumns.MIME_TYPE, "audio/mpeg")
        put(MediaStore.MediaColumns.TITLE, title)
        put(MediaStore.Audio.Media.IS_RINGTONE, true)
        put(MediaStore.Audio.Media.IS_NOTIFICATION, false)
        put(MediaStore.Audio.Media.IS_ALARM, false)
        put(MediaStore.Audio.Media.IS_MUSIC, false)
      }

      val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
      } else {
        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
      }

      val resolver = reactContext.contentResolver
      val uri = resolver.insert(collection, values)
        ?: throw IllegalStateException("Impossible de creer la sonnerie")

      resolver.openOutputStream(uri)?.use { output ->
        target.inputStream().use { input -> input.copyTo(output) }
      }

      RingtoneManager.setActualDefaultRingtoneUri(
        reactContext,
        RingtoneManager.TYPE_RINGTONE,
        uri
      )
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("RINGTONE_ERROR", error)
    }
  }
}
