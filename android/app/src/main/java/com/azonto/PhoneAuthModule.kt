package com.azonto

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.firebase.FirebaseException
import com.google.firebase.auth.*
import com.google.firebase.auth.PhoneAuthProvider.ForceResendingToken
import com.google.firebase.auth.PhoneAuthProvider.OnVerificationStateChangedCallbacks
import java.util.concurrent.TimeUnit

class PhoneAuthModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var verificationId: String? = null
    private var resendingToken: ForceResendingToken? = null
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()

    override fun getName(): String = "PhoneAuthModule"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun verifyPhoneNumber(phoneNumber: String) {
        val activity = getCurrentActivity() ?: return

        val callbacks = object : OnVerificationStateChangedCallbacks() {
            override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                val params = Arguments.createMap()
                params.putString("code", credential.smsCode)
                sendEvent("onVerificationCompleted", params)
                
                // Optional: Automatically sign in if SMS code is present
                if (credential.smsCode != null) {
                    signInWithPhoneAuthCredential(credential, null)
                }
            }

            override fun onVerificationFailed(e: FirebaseException) {
                val params = Arguments.createMap()
                params.putString("message", e.message)
                sendEvent("onVerificationFailed", params)
            }

            override fun onCodeSent(id: String, token: ForceResendingToken) {
                verificationId = id
                resendingToken = token
                val params = Arguments.createMap()
                params.putString("verificationId", id)
                sendEvent("onCodeSent", params)
            }
        }

        val options = PhoneAuthOptions.newBuilder(auth)
            .setPhoneNumber(phoneNumber)
            .setTimeout(60L, TimeUnit.SECONDS)
            .setActivity(activity)
            .setCallbacks(callbacks)
            .build()
        PhoneAuthProvider.verifyPhoneNumber(options)
    }

    @ReactMethod
    fun signInWithCode(code: String, promise: Promise) {
        val id = verificationId
        if (id == null) {
            promise.reject("ERR_NO_VERIFICATION_ID", "No verification ID found. Call verifyPhoneNumber first.")
            return
        }

        val credential = PhoneAuthProvider.getCredential(id, code)
        signInWithPhoneAuthCredential(credential, promise)
    }

    private fun signInWithPhoneAuthCredential(credential: PhoneAuthCredential, promise: Promise?) {
        auth.signInWithCredential(credential)
            .addOnCompleteListener { task ->
                if (task.isSuccessful) {
                    val user = task.result?.user
                    val params = Arguments.createMap()
                    params.putString("uid", user?.uid)
                    params.putString("phoneNumber", user?.phoneNumber)
                    
                    if (promise != null) {
                        promise.resolve(params)
                    } else {
                        sendEvent("onSignInSuccess", params)
                    }
                } else {
                    if (promise != null) {
                        promise.reject("ERR_SIGN_IN_FAILED", task.exception?.message)
                    } else {
                        val errorParams = Arguments.createMap()
                        errorParams.putString("message", task.exception?.message)
                        sendEvent("onSignInFailure", errorParams)
                    }
                }
            }
    }
}
