package com.example

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      Box(
        modifier = Modifier
          .fillMaxSize()
          .background(Color(0xFF050505))
          .systemBarsPadding()
      ) {
        GameWebView()
      }
    }
  }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun GameWebView() {
  AndroidView(
    factory = { context ->
      WebView(context).apply {
        layoutParams = android.view.ViewGroup.LayoutParams(
          android.view.ViewGroup.LayoutParams.MATCH_PARENT,
          android.view.ViewGroup.LayoutParams.MATCH_PARENT
        )
        settings.apply {
          javaScriptEnabled = true
          domStorageEnabled = true
          mediaPlaybackRequiresUserGesture = false
          mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }
        webViewClient = WebViewClient()
        webChromeClient = android.webkit.WebChromeClient()
        loadUrl("file:///android_asset/www/index.html")
      }
    },
    modifier = Modifier.fillMaxSize()
  )
}

