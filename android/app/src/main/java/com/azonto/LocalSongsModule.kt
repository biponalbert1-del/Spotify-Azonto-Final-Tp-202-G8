package com.azonto

import android.content.ContentUris
import android.net.Uri
import android.provider.MediaStore
import android.webkit.MimeTypeMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class LocalSongsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "LocalSongs"

  private fun cachedAudioPath(id: String, uri: Uri): String {
    val resolver = reactContext.contentResolver
    val type = resolver.getType(uri)
    val extension = MimeTypeMap.getSingleton().getExtensionFromMimeType(type) ?: "mp3"
    val targetDir = java.io.File(reactContext.cacheDir, "local-songs")
    if (!targetDir.exists()) {
      targetDir.mkdirs()
    }

    val target = java.io.File(targetDir, "$id.$extension")
    if (target.exists() && target.length() > 0) {
      return target.absolutePath
    }

    resolver.openInputStream(uri)?.use { input ->
      target.outputStream().use { output ->
        input.copyTo(output)
      }
    }

    return target.absolutePath
  }

  @ReactMethod
  fun prepareSong(id: String, uriText: String, promise: Promise) {
    try {
      val uri = Uri.parse(uriText)
      promise.resolve(cachedAudioPath(id, uri))
    } catch (error: Exception) {
      promise.reject("LOCAL_SONG_PREPARE_ERROR", error)
    }
  }

  @ReactMethod
  fun getSongs(promise: Promise) {
    val songs = Arguments.createArray()
    val projection = arrayOf(
      MediaStore.Audio.Media._ID,
      MediaStore.Audio.Media.TITLE,
      MediaStore.Audio.Media.ARTIST,
      MediaStore.Audio.Media.ALBUM,
      MediaStore.Audio.Media.DURATION,
      MediaStore.Audio.Media.IS_MUSIC
    )

    try {
      val resolver = reactContext.contentResolver
      resolver.query(
        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
        projection,
        "${MediaStore.Audio.Media.IS_MUSIC} != 0",
        null,
        "${MediaStore.Audio.Media.TITLE} COLLATE NOCASE ASC"
      )?.use { cursor ->
        val idIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
        val titleIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
        val artistIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
        val albumIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
        val durationIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)

        while (cursor.moveToNext()) {
          val id = cursor.getLong(idIndex)
          val uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
          val item = Arguments.createMap()
          val title = cursor.getString(titleIndex).orEmpty()
          val artist = cursor.getString(artistIndex).orEmpty()
          val album = cursor.getString(albumIndex).orEmpty()
          val durationMs = cursor.getLong(durationIndex)

          item.putString("id", "local-$id")
          item.putString("title", if (title.isBlank()) "Titre local" else title)
          item.putString("artist", if (artist.isBlank() || artist == "<unknown>") "Telephone" else artist)
          item.putString("album", album)
          item.putString("uri", uri.toString())
          item.putDouble("durationMs", durationMs.toDouble())
          songs.pushMap(item)
        }
      }

      promise.resolve(songs)
    } catch (error: Exception) {
      promise.reject("LOCAL_SONGS_ERROR", error)
    }
  }
}
