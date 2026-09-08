(function () {
  "use strict";

  var vertexShaderGLSL = "\
attribute vec2 position;\
void main() {\
  gl_Position = vec4(position, 0.0, 1.0);\
}";

  var fragmentShaderGLSL = "\
precision highp float;\
uniform vec2 u_resolution;\
uniform float u_time;\
uniform vec3 u_colorBottom;\
uniform vec3 u_colorMid;\
uniform vec3 u_colorTop;\
uniform float u_speed;\
float hash(vec2 p) {\
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);\
}\
float noise(vec2 p) {\
  vec2 i = floor(p);\
  vec2 f = fract(p);\
  float a = hash(i);\
  float b = hash(i + vec2(1.0, 0.0));\
  float c = hash(i + vec2(0.0, 1.0));\
  float d = hash(i + vec2(1.0, 1.0));\
  vec2 u = f * f * (3.0 - 2.0 * f);\
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;\
}\
float fbm(vec2 p, float t) {\
  float v = 0.0;\
  float a = 0.5;\
  float fi = 0.0;\
  mat2 rot = mat2(0.86, 0.51, -0.51, 0.86);\
  for (int i = 0; i < 6; i++) {\
    vec2 morph = vec2(sin(t * 0.5 + fi), cos(t * 0.3 - fi)) * 0.05;\
    v += a * noise(p + morph);\
    p = rot * p * 2.0;\
    a *= 0.5;\
    fi += 1.0;\
  }\
  return v;\
}\
void main() {\
  vec2 uv = gl_FragCoord.xy / u_resolution;\
  float t = u_time * u_speed;\
  vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);\
  vec2 p = (uv - 0.5) * aspect;\
  vec2 wind = vec2(t * 0.08, t * 0.015);\
  float pattern = fbm(p * 2.0 - wind, t);\
  float bandLow = smoothstep(0.3, 0.65, pattern);\
  float bandHigh = smoothstep(0.7, 0.95, pattern);\
  vec3 color = mix(u_colorBottom, u_colorMid, bandLow);\
  color = mix(color, u_colorTop, bandHigh);\
  gl_FragColor = vec4(color, 1.0);\
}";

  function hexToRgb(hex) {
    var cleaned = hex.replace("#", "");
    return [
      parseInt(cleaned.slice(0, 2), 16) / 255,
      parseInt(cleaned.slice(2, 4), 16) / 255,
      parseInt(cleaned.slice(4, 6), 16) / 255
    ];
  }

  function initCloudscapeBg() {
    var canvas = document.getElementById("cloudscapeCanvas");
    if (!canvas) return;

    var gl = canvas.getContext("webgl", { antialias: true, alpha: true }) ||
             canvas.getContext("experimental-webgl");
    if (!gl) {
      console.warn("WebGL not supported for cloudscape background");
      return;
    }

    function compileShader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        gl.deleteShader(s);
        return null;
      }
      return s;
    }

    var vs = compileShader(gl.VERTEX_SHADER, vertexShaderGLSL);
    var fs = compileShader(gl.FRAGMENT_SHADER, fragmentShaderGLSL);
    if (!vs || !fs) return;

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    var posAttr = gl.getAttribLocation(program, "position");
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(program, "u_resolution");
    var uTime = gl.getUniformLocation(program, "u_time");
    var uBottom = gl.getUniformLocation(program, "u_colorBottom");
    var uMid = gl.getUniformLocation(program, "u_colorMid");
    var uTop = gl.getUniformLocation(program, "u_colorTop");
    var uSpeed = gl.getUniformLocation(program, "u_speed");

    // Colors tuned for rich cloudscape — deeper blue-violet twilight behind liquid glass
    var cBottom = hexToRgb("#7eb8f5");
    var cMid = hexToRgb("#d0e4fc");
    var cTop = hexToRgb("#f2f6ff");
    var speed = 0.65;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = window.innerWidth;
      var h = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    }

    resize();
    window.addEventListener("resize", resize);

    var start = performance.now();
    function render(now) {
      var elapsed = (now - start) / 1000;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform1f(uTime, elapsed);
      gl.uniform3f(uBottom, cBottom[0], cBottom[1], cBottom[2]);
      gl.uniform3f(uMid, cMid[0], cMid[1], cMid[2]);
      gl.uniform3f(uTop, cTop[0], cTop[1], cTop[2]);
      gl.uniform1f(uSpeed, speed);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCloudscapeBg);
  } else {
    initCloudscapeBg();
  }
})();
