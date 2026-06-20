package com.azonto

import android.app.Activity
import android.content.Intent
import android.content.ContentUris
import android.net.Uri
import android.provider.OpenableColumns
import android.provider.MediaStore
import android.webkit.MimeTypeMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

class LocalSongsModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private val pickFileRequestCode = 2408
  private var pendingPickPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName(): String = "LocalSongs"

  override fun onNewIntent(intent: Intent) = Unit

  override fun onActivityResult(
    activity: Activity,
    requestCode: Int,
    resultCode: Int,
    data: Intent?
  ) {
    if (requestCode != pickFileRequestCode) {
      return
    }

    val promise = pendingPickPromise ?: return
    pendingPickPromise = null

    if (resultCode != Activity.RESULT_OK) {
      promise.resolve(null)
      return
    }

    val uri = data?.data
    if (uri == null) {
      promise.resolve(null)
      return
    }

    try {
      data.flags.and(Intent.FLAG_GRANT_READ_URI_PERMISSION).let { flags ->
        if (flags != 0) {
          reactContext.contentResolver.takePersistableUriPermission(
            uri,
            Intent.FLAG_GRANT_READ_URI_PERMISSION
          )
        }
      }
    } catch (_: Exception) {
      // Some providers do not allow persistable permissions.
    }

    val item = Arguments.createMap()
    item.putString("uri", uri.toString())
    item.putString("name", displayName(uri))
    item.putString("mimeType", reactContext.contentResolver.getType(uri))
    item.putDouble("size", fileSize(uri).toDouble())
    promise.resolve(item)
  }

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
  fun pickFile(kind: String, promise: Promise) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject("FILE_PICKER_NO_ACTIVITY", "Aucune activite Android active.")
      return
    }

    if (pendingPickPromise != null) {
      promise.reject("FILE_PICKER_BUSY", "Un choix de fichier est deja ouvert.")
      return
    }

    val mimeTypes = if (kind == "image") {
      arrayOf("image/jpeg", "image/png", "image/webp")
    } else {
      arrayOf("audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/wav")
    }

    val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
      addCategory(Intent.CATEGORY_OPENABLE)
      type = if (kind == "image") "image/*" else "audio/*"
      putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
    }

    try {
      pendingPickPromise = promise
      activity.startActivityForResult(intent, pickFileRequestCode)
    } catch (error: Exception) {
      pendingPickPromise = null
      promise.reject("FILE_PICKER_ERROR", error)
    }
  }

  @ReactMethod
  fun uploadFileToSupabase(
    supabaseUrl: String,
    anonKey: String,
    accessToken: String,
    bucket: String,
    path: String,
    uriText: String,
    mimeType: String,
    promise: Promise
  ) {
    try {
      val uri = Uri.parse(uriText)
      val safeUrl = supabaseUrl.trimEnd('/')
      val encodedPath = path.split('/').joinToString("/") {
        URLEncoder.encode(it, "UTF-8").replace("+", "%20")
      }
      val uploadUrl = URL("$safeUrl/storage/v1/object/$bucket/$encodedPath")
      val connection = uploadUrl.openConnection() as HttpURLConnection
      connection.requestMethod = "POST"
      connection.doOutput = true
      connection.setRequestProperty("apikey", anonKey)
      connection.setRequestProperty(
        "Authorization",
        "Bearer ${if (accessToken.isBlank()) anonKey else accessToken}"
      )
      connection.setRequestProperty("Content-Type", mimeType)
      connection.setRequestProperty("x-upsert", "true")

      val fileSize = fileSize(uri)
      if (fileSize > 0) {
        connection.setFixedLengthStreamingMode(fileSize)
      }

      reactContext.contentResolver.openInputStream(uri)?.use { input ->
        connection.outputStream.use { output ->
          input.copyTo(output)
        }
      } ?: throw IllegalStateException("Fichier introuvable.")

      val status = connection.responseCode
      if (status !in 200..299) {
        val errorText = connection.errorStream?.bufferedReader()?.use { it.readText() }
          ?: "Upload Supabase impossible."
        promise.reject("SUPABASE_UPLOAD_ERROR", errorText)
        return
      }

      val result = Arguments.createMap()
      result.putString("bucket", bucket)
      result.putString("path", path)
      result.putString("publicUrl", "$safeUrl/storage/v1/object/public/$bucket/$encodedPath")
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("SUPABASE_UPLOAD_ERROR", error)
    }
  }

  @ReactMethod
  fun downloadFile(url: String, fileName: String, promise: Promise) {
    try {
      val request = android.app.DownloadManager.Request(Uri.parse(url))
        .setTitle(fileName)
        .setDescription("Telechargement de $fileName")
        .setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, fileName)
        .setAllowedOverMetered(true)
        .setAllowedOverRoaming(true)

      val downloadManager = reactContext.getSystemService(android.content.Context.DOWNLOAD_SERVICE) as android.app.DownloadManager
      downloadManager.enqueue(request)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("DOWNLOAD_ERROR", error)
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
      MediaStore.Audio.Media.MIME_TYPE,
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
        val mimeTypeIndex = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.MIME_TYPE)

        while (cursor.moveToNext()) {
          val id = cursor.getLong(idIndex)
          val uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
          val item = Arguments.createMap()
          val title = cursor.getString(titleIndex).orEmpty()
          val artist = cursor.getString(artistIndex).orEmpty()
          val album = cursor.getString(albumIndex).orEmpty()
          val durationMs = cursor.getLong(durationIndex)
          val mimeType = cursor.getString(mimeTypeIndex).orEmpty()

          item.putString("id", "local-$id")
          item.putString("title", if (title.isBlank()) "Titre local" else title)
          item.putString("artist", if (artist.isBlank() || artist == "<unknown>") "Telephone" else artist)
          item.putString("album", album)
          item.putString("uri", uri.toString())
          item.putDouble("durationMs", durationMs.toDouble())
          item.putString("mimeType", mimeType)
          songs.pushMap(item)
        }
      }

      promise.resolve(songs)
    } catch (error: Exception) {
      promise.reject("LOCAL_SONGS_ERROR", error)
    }
  }

  private fun displayName(uri: Uri): String {
    reactContext.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
      val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
      if (nameIndex >= 0 && cursor.moveToFirst()) {
        return cursor.getString(nameIndex).orEmpty()
      }
    }

    return uri.lastPathSegment ?: "fichier"
  }

  private fun fileSize(uri: Uri): Long {
    reactContext.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
      val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
      if (sizeIndex >= 0 && cursor.moveToFirst()) {
        return cursor.getLong(sizeIndex)
      }
    }

    return 0
  }
}
