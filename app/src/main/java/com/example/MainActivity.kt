package com.example

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.webkit.WebChromeClient
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

    // Warm up WebView as early as possible to reduce cold-start delay.
    WebView(this).destroy()

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
        setBackgroundColor(android.graphics.Color.rgb(5, 5, 5))
        overScrollMode = View.OVER_SCROLL_NEVER
        isVerticalScrollBarEnabled = false
        isHorizontalScrollBarEnabled = false
        setLayerType(View.LAYER_TYPE_HARDWARE, null)
        setInitialScale(100)

        layoutParams = ViewGroup.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT
        )

        settings.apply {
          javaScriptEnabled = true
          domStorageEnabled = true
          databaseEnabled = true
          allowFileAccess = true
          allowContentAccess = true
          mediaPlaybackRequiresUserGesture = false
          mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
          cacheMode = WebSettings.LOAD_DEFAULT
          loadsImagesAutomatically = true
          blockNetworkImage = false
          builtInZoomControls = false
          displayZoomControls = false
          useWideViewPort = true
          loadWithOverviewMode = true
        }

        webViewClient = WebViewClient()
        webChromeClient = WebChromeClient()
        loadUrl("file:///android_asset/www/index.html")
      }
    },
    modifier = Modifier.fillMaxSize()
  )
}
