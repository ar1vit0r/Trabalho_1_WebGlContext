"use strict";

var vertexShaderSource = `#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
in vec4 a_color;

// A matrix to transform the positions by
uniform mat4 u_matrix;

// a varying the color to the fragment shader
out vec4 v_color;

// all shaders have a main function
void main() {
  // Multiply the position by the matrix.
  gl_Position = u_matrix * a_position;

  // Pass the color to the fragment shader.
  v_color = a_color;
}
`;

var fragmentShaderSource = `#version 300 es

precision highp float;

// the varied color passed from the vertex shader
in vec4 v_color;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  outColor = v_color;
}
`;


async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");
  var gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  // Use our boilerplate utils to compile the shaders and link into a program
  var program = webglUtils.createProgramFromSources(gl,[vertexShaderSource, fragmentShaderSource]);

  // look up where the vertex data needs to go.
  var positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  var colorAttributeLocation = gl.getAttribLocation(program, "a_color");

  // look up uniform locations
  var matrixLocation = gl.getUniformLocation(program, "u_matrix");

  // Create a buffer
  var positionBuffer = gl.createBuffer();

  // Create a vertex array object (attribute state)
  var vao = gl.createVertexArray();

  // and make it the one we're currently working with
  gl.bindVertexArray(vao);

  // Turn on the attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Set Geometry.
  var numVertices = setGeometry(gl);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 3;          // 3 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

  // create the color buffer, make it the current ARRAY_BUFFER
  // and copy in the color values
  var colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  setColors(gl);

  // Turn on the attribute
  gl.enableVertexAttribArray(colorAttributeLocation);

  // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
  var size = 3;          // 3 components per iteration
  var type = gl.UNSIGNED_BYTE;   // the data is 8bit unsigned bytes
  var normalize = true;  // convert from 0-255 to 0.0-1.0
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next color
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(colorAttributeLocation, size, type, normalize, stride, offset);

  function radToDeg(r) {
    return r * 180 / Math.PI;
  }

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  // First let's make some variables
  // to hold the translation,
  var translation = [0, 0, 0];
  var rotation = [degToRad(0), degToRad(0), degToRad(0)];
  var scale = [1, 1, 1];
  var t = 0;

  //Cameras
  var zoom = 10;
  var target = [0, 200, 300];
  var targetAngleRadians = 0;
  var targetRadius = 300;
  var fieldOfViewRadians = degToRad(60);
  var cameraPosition = [0, 1000, 1000];
  var cameraTarget = [0, -100, 0];
  var up = [0, 1, 0];

  //time
  var time = new Date();
  time = time.getHours();
  var then = 0;
  var rotationSpeed = 1.2; // 1.2 = +ou- 1/5 de volta.

  drawScene(time);

  // Setup a ui.
  webglLessonsUI.setupSlider("#x",      {value: translation[0], slide: updatePosition(0), max: gl.canvas.width });
  webglLessonsUI.setupSlider("#y",      {value: translation[1], slide: updatePosition(1), max: gl.canvas.height});
  webglLessonsUI.setupSlider("#z",      {value: translation[2], slide: updatePosition(2), max: gl.canvas.height});
  webglLessonsUI.setupSlider("#deltaCubic", {value: t, slide: updateBezier(), min: 0, max: 1, step: 0.01});
  webglLessonsUI.setupSlider("#angleX", {value: radToDeg(rotation[0]), slide: updateRotation(0), max: 360});
  webglLessonsUI.setupSlider("#angleY", {value: radToDeg(rotation[1]), slide: updateRotation(1), max: 360});
  webglLessonsUI.setupSlider("#angleZ", {value: radToDeg(rotation[2]), slide: updateRotation(2), max: 360});
  webglLessonsUI.setupSlider("#scaleX", {value: scale[0], slide: updateScale(0), min: -5, max: 5, step: 0.01, precision: 2});
  webglLessonsUI.setupSlider("#scaleY", {value: scale[1], slide: updateScale(1), min: -5, max: 5, step: 0.01, precision: 2});
  webglLessonsUI.setupSlider("#scaleZ", {value: scale[2], slide: updateScale(2), min: -2, max: 2, step: 0.01, precision: 2});
  webglLessonsUI.setupSlider("#targetPointRotate", {value: radToDeg(targetAngleRadians), slide: updateTargetAngle, min: -360, max: 360});
  webglLessonsUI.setupSlider("#targetHeight", {value: target[1], slide: updateTargetHeight, min: 50, max: 300});
  webglLessonsUI.setupSlider("#x_Position", {value: cameraPosition[0], slide: updateCameraPosition(0), min: -1000, max: 1000});
  webglLessonsUI.setupSlider("#y_Position", {value: cameraPosition[1], slide: updateCameraPosition(1), min: -1000, max: 1000});
  webglLessonsUI.setupSlider("#z_Position", {value: cameraPosition[2], slide: updateCameraPosition(2), min: -1000, max: 1000});
  webglLessonsUI.setupSlider("#cameraTargetX", {value: cameraTarget[0], slide: updateTargetPosition(0), min: -300, max: 300});
  webglLessonsUI.setupSlider("#cameraTargetY", {value: cameraTarget[1], slide: updateTargetPosition(1), min: -300, max: 300});
  webglLessonsUI.setupSlider("#cameraTargetZ", {value: cameraTarget[2], slide: updateTargetPosition(2), min: -300, max: 300});
  webglLessonsUI.setupSlider("#Zoom", {value: zoom, slide: updateZoom(),  min: 1, max: 100, step: 0.01, precision: 2});
  //webglLessonsUI.setupSlider("#cameraHeightX", {value: up[0], slide: updateCameraHeight(0), min: -5, max: 5});
  //webglLessonsUI.setupSlider("#cameraHeightY", {value: up[1], slide: updateCameraHeight(1), min: -5, max: 5});
  //webglLessonsUI.setupSlider("#cameraHeightZ", {value: up[2], slide: updateCameraHeight(2), min: -5, max: 5});


  function updateZoom() {
    return function(event, ui) {
      zoom = ui.value;
      fieldOfViewRadians = degToRad(100)/zoom;
      drawScene(time);
    };
  }

  function updateZoom2() { // Também funciona...
    return function(event, ui) {
      zoom = ui.value;
      zoom = zoom/10;
      var tempcameraPosition = [];
      tempcameraPosition[0] = cameraPosition[1];
      tempcameraPosition[1] = cameraPosition[2];
      cameraPosition[1] = cameraPosition[1]/zoom;
      cameraPosition[2] = cameraPosition[2]/zoom;
      drawScene(time);
      cameraPosition[1] = tempcameraPosition[0];
      cameraPosition[2] = tempcameraPosition[1];
    };
  }

  function updateZoom3() { // ao contrário
    return function(event, ui) {
      zoom = ui.value;
      zoom = zoom/10;
      fieldOfViewRadians = degToRad(6)*zoom;
      drawScene(time);
    };
  }

  function AnimationOne(now) {
    if((document.getElementById("anim0").checked)){
      return;
    }else if((document.getElementById("anim2").checked)){
      return;
    }
    // Convert to seconds
    now *= 0.001;
    // Subtract the previous time from the current time
    var deltaTime = now - then;
    // Remember the current time for the next frame.
    then = now + deltaTime;

    // Compute the matrix
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var zNear = 1;
    var zFar = 5000;
    var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    // Compute the camera's matrix using look at.
    var cameraMatrix = m4.lookAt(cameraPosition, cameraTarget, up);

    // Make a view matrix from the camera matrix.
    var viewMatrix = m4.inverse(cameraMatrix);

    // create a viewProjection matrix. This will both apply perspective
    // AND move the world so that the camera is effectively the origin
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    var anim = document.getElementById("anim0");
    if(translation[0] < 0 + 200){ 
      translation[0] += 1;
    }
    if(translation[1] < 0 + 200){
      translation[1] += 1;
    }else if(!anim.checked){
      anim.checked = true;
    } 

    // Draw in a grid
    var deep = 5;
    var across = 5;
    for (var zz = 0; zz < deep; ++zz) {
      var v = zz / (deep - 1);
      var z = (v - .5) * deep * 150;
      for (var xx = 0; xx < across; ++xx) {
        var u = xx / (across - 1);
        var x = (u - .5) * across * 150;
        var matrix = m4.lookAt([x, 0, z], target, up);
        draw(matrix, viewProjectionMatrix, matrixLocation, numVertices);
      }
    }
    draw(m4.translation(target[0], target[1], target[2]), viewProjectionMatrix, matrixLocation, numVertices);
    requestAnimationFrame(AnimationOne);
  }
  
  function AnimationTwo(now) {
    if((document.getElementById("anim0").checked)){
      return;
    }else if((document.getElementById("anim1").checked)){
      return;
    }
    // Convert to seconds
    now *= 0.001;
    // Subtract the previous time from the current time
    var deltaTime = now - then;
    // Remember the current time for the next frame.
    then = now;

    // Compute the matrix
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var zNear = 1;
    var zFar = 5000;
    var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);
    var cameraPosition1 = [-300, 500, 700];

    // Compute the camera's matrix using look at.
    var cameraMatrix = m4.lookAt(cameraPosition1, cameraTarget, up);
    
    // Make a view matrix from the camera matrix.
    var viewMatrix = m4.inverse(cameraMatrix);
    
    // create a viewProjection matrix. This will both apply perspective
    // AND move the world so that the camera is effectively the origin
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    
    // Every frame increase the rotation a little.
    rotation[0] += rotationSpeed * deltaTime;
    var cont;
    var anim = document.getElementById("anim0");
    
    if(translation[0] < 0 + 100){
      cont++;
      translation[0]+=1;
    }else if(translation[1] < 0 + 300){
      translation[1]+=1;
    }else if(cont > 0){
      cont--;
      translation[1]-=1;
    }else if(!anim.checked){
      anim.checked = true;
    }

    // Draw in a grid
    var deep = 5;
    var across = 5;
    for (var zz = 0; zz < deep; ++zz) {
      var v = zz / (deep - 1);
      var z = (v - .5) * deep * 150;
      for (var xx = 0; xx < across; ++xx) {
        var u = xx / (across - 1);
        var x = (u - .5) * across * 150;
        var matrix = m4.lookAt([x, 0, z], target, up);
        draw(matrix, viewProjectionMatrix, matrixLocation, numVertices);
      }
    }
    draw(m4.translation(target[0], target[1], target[2]), viewProjectionMatrix, matrixLocation, numVertices);
    requestAnimationFrame(AnimationTwo);
  }

  function updateCameraHeight(index) {
    return function(event, ui) {
      up[index] = ui.value;
      drawScene(time);
    };
  }

  function updateTargetPosition(index) {
    return function(event, ui) {
      cameraTarget[index] = ui.value;
      drawScene(time);
    };
  }

  function updateCameraPosition(index) {
    return function(event, ui) {
      cameraPosition[index] = ui.value;
      drawScene(time);
    };
  }

  function updateTargetAngle(event, ui) {
    targetAngleRadians = degToRad(ui.value);
    target[0] = Math.sin(targetAngleRadians) * targetRadius;
    target[2] = Math.cos(targetAngleRadians) * targetRadius;
    drawScene(time);
  }

  function updateTargetHeight(event, ui) {
    target[1] = ui.value;
    drawScene(time);
  }

  function updateBezier() {
    return function(event, ui) {
      t = ui.value;
      drawScene(time);
    };
  }

  function updatePosition(index) {
    return function(event, ui) {
      translation[index] = ui.value;
      drawScene(time);
    };
  }

  function updateRotation(index) {
    return function(event, ui) {
      var angleInDegrees = ui.value;
      var angleInRadians = degToRad(angleInDegrees);
      rotation[index] = angleInRadians;
      drawScene(time);
    };
  }

  function updateScale(index) {
    return function(event, ui) {
      scale[index] = ui.value;
      drawScene(time);
    };
  }

  // Draw the scene.
  function drawScene(now) {
    // Convert to seconds
    now *= 0.001;
    // Subtract the previous time from the current time
    var deltaTime = now - then;
    // Remember the current time for the next frame.
    then = now + deltaTime;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // turn on depth testing
    gl.enable(gl.DEPTH_TEST);

    // tell webgl to cull faces
    gl.enable(gl.CULL_FACE);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    numVertices = setGeometry(gl);
    setColors(gl);

    //não consegui fazer os botões Html excecutarem as funções
    if(document.getElementById("anim1").checked){
      AnimationOne(time);
    }else if(document.getElementById("anim2").checked){
      AnimationTwo(time); 
    }else{
      translation = [0, 0, 0];
      rotation = [degToRad(0), degToRad(0), degToRad(0)];
    }

    // Compute the matrix
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var zNear = 1;
    var zFar = 5000;
    var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    // Compute the camera's matrix using look at.
    var cameraMatrix = m4.lookAt(cameraPosition, cameraTarget, up);

    // Make a view matrix from the camera matrix.
    var viewMatrix = m4.inverse(cameraMatrix);

    // create a viewProjection matrix. This will both apply perspective
    // AND move the world so that the camera is effectively the origin
    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    if(document.getElementById('view1').checked){
      var cameraPosition1 = [1000, 0, 0];
      var aspect1 = ((gl.canvas.clientWidth/2) / (gl.canvas.clientHeight/2));
      var zFar1 = 1000;
      var cameraMatrix1 = m4.lookAt(cameraPosition1, cameraTarget, up);
      projectionMatrix = m4.perspective(fieldOfViewRadians, aspect1, zNear, zFar1); 
      viewMatrix = m4.inverse(cameraMatrix1);
      viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    }else if(document.getElementById('view2').checked){
      var cameraPosition1 = [-300, 500, 700];
      var aspect1 = ((gl.canvas.clientWidth/4) / (gl.canvas.clientHeight/4));
      var zFar1 = 2000;
      var cameraMatrix2 = m4.lookAt(cameraPosition1, cameraTarget, up);
      projectionMatrix = m4.perspective(fieldOfViewRadians, aspect1, zNear, zFar1);
      viewMatrix = m4.inverse(cameraMatrix2);
      viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    }

    // Draw in a grid
    var deep = 5;
    var across = 5;
    for (var zz = 0; zz < deep; ++zz) {
      var v = zz / (deep - 1);
      var z = (v - .5) * deep * 150;
      for (var xx = 0; xx < across; ++xx) {
        var u = xx / (across - 1);
        var x = (u - .5) * across * 150;
        var matrix = m4.lookAt([x, 0, z], target, up);
        draw(matrix, viewProjectionMatrix, matrixLocation, numVertices);
      }
    }
    draw(m4.translation(target[0], target[1], target[2]), viewProjectionMatrix, matrixLocation, numVertices);
    requestAnimationFrame(drawScene);
  }

function draw(matrix, viewProjectionMatrix, matrixLocation, numVertices) {
  if(document.getElementById('Bezier').checked) {
    matrix = m4.translate2(matrix, translation[0], translation[1], t); //bezier
  }else 
    matrix = m4.translate(matrix, translation[0], translation[1], translation[2]); //linear

  matrix = m4.xRotate(matrix, rotation[0]);
  matrix = m4.yRotate(matrix, rotation[1]);
  matrix = m4.zRotate(matrix, rotation[2]);

  matrix = m4.scale(matrix, scale[0], scale[1], scale[2]);

  // multiply that with the viewProjecitonMatrix
  matrix = m4.multiply(viewProjectionMatrix, matrix);

  // Set the matrix.
  gl.uniformMatrix4fv(matrixLocation, false, matrix);

    // Draw the geometry.
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    gl.drawArrays(primitiveType, offset, numVertices);
  }
} //end main

// Fill the current ARRAY_BUFFER buffer
function setGeometry(gl) {
  var positions = new Float32Array(HeadData.positions);
  var matrix = m4.scale(m4.yRotation(Math.PI), 6, 6, 6);
  if(document.getElementById("Loaded").checked){
    document.getElementById("Models").setAttribute("disabled", false);
    var file = document.getElementById("Models").value;
    positions = new Float32Array(file.positions);
    matrix = m4.scale(m4.yRotation(Math.PI), 6, 6, 6);
  }
  for (var ii = 0; ii < positions.length; ii += 3) {
    var vector = m4.transformVector(matrix, [positions[ii + 0], positions[ii + 1], positions[ii + 2], 1]);
    positions[ii + 0] = vector[0];
    positions[ii + 1] = vector[1];
    positions[ii + 2] = vector[2];
  }
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  return positions.length / 3;
}

function setColors(gl) {
  var normals = HeadData.normals;
  var colors = new Uint8Array(normals.length);
  var offset = 0;
  if(document.getElementById('Loaded').checked){
    var file = document.getElementById("Models").value;
    normals = file.normals;
    colors = new Uint8Array(normals.length);
  }
  for (var ii = 0; ii < colors.length; ii += 3) {
    for (var jj = 0; jj < 3; ++jj) {
      colors[offset] = (normals[offset] * 0.5 + 0.5) * 255;
      ++offset;
    }
  }
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
}

var m4 = {

  perspective: function(fieldOfViewInRadians, aspect, near, far) {
    var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
    var rangeInv = 1.0 / (near - far);

    return [
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0,
    ];
  },

  projection: function(width, height, depth) {
    // Note: This matrix flips the Y axis so 0 is at the top.
    return [
       2 / width, 0, 0, 0,
       0, -2 / height, 0, 0,
       0, 0, 2 / depth, 0,
      -1, 1, 0, 1,
    ];
  },

  multiply: function(a, b) {
    var a00 = a[0 * 4 + 0];
    var a01 = a[0 * 4 + 1];
    var a02 = a[0 * 4 + 2];
    var a03 = a[0 * 4 + 3];
    var a10 = a[1 * 4 + 0];
    var a11 = a[1 * 4 + 1];
    var a12 = a[1 * 4 + 2];
    var a13 = a[1 * 4 + 3];
    var a20 = a[2 * 4 + 0];
    var a21 = a[2 * 4 + 1];
    var a22 = a[2 * 4 + 2];
    var a23 = a[2 * 4 + 3];
    var a30 = a[3 * 4 + 0];
    var a31 = a[3 * 4 + 1];
    var a32 = a[3 * 4 + 2];
    var a33 = a[3 * 4 + 3];
    var b00 = b[0 * 4 + 0];
    var b01 = b[0 * 4 + 1];
    var b02 = b[0 * 4 + 2];
    var b03 = b[0 * 4 + 3];
    var b10 = b[1 * 4 + 0];
    var b11 = b[1 * 4 + 1];
    var b12 = b[1 * 4 + 2];
    var b13 = b[1 * 4 + 3];
    var b20 = b[2 * 4 + 0];
    var b21 = b[2 * 4 + 1];
    var b22 = b[2 * 4 + 2];
    var b23 = b[2 * 4 + 3];
    var b30 = b[3 * 4 + 0];
    var b31 = b[3 * 4 + 1];
    var b32 = b[3 * 4 + 2];
    var b33 = b[3 * 4 + 3];
    return [
      b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
      b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
      b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
      b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
      b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
      b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
      b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
      b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
      b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
      b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
      b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
      b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
      b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
      b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
      b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
      b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
    ];
  },

  translation: function(tx, ty, tz) {
    return [
       1,  0,  0,  0,
       0,  1,  0,  0,
       0,  0,  1,  0,
       tx, ty, tz, 1,
    ];
  },

  translation_bezier: function(tx, ty, tz) {
    //https://javascript.info/bezier-curve
    //https://pomax.github.io/bezierinfo/
    var x = 0 * (1-tz)**3 + (0+50) * 3 * (1-tz)**2 * tz + (0+100) * 3 * (1-tz) * tz**2 + tx * tz**3;
    var y = 0 * (1-tz)**3 + (0+50) * 3 * (1-tz)**2 * tz + (0+100) * 3 * (1-tz) * tz**2 + ty * tz**3;
    return [
       1,  0,  0,  0,
       0,  1,  0,  0,
       0,  0,  1,  0,
       x,  y,  0,  1,
    ];
  },

  xRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
      1, 0, 0, 0,
      0, c, s, 0,
      0, -s, c, 0,
      0, 0, 0, 1,
    ];
  },

  yRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, 0, 1,
    ];
  },

  zRotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
       c, s, 0, 0,
      -s, c, 0, 0,
       0, 0, 1, 0,
       0, 0, 0, 1,
    ];
  },

  point_Rotation: function(angleInRadians) {
    var c = Math.cos(angleInRadians);
    var s = Math.sin(angleInRadians);
    return [
       c,-s, 0, 0,
       s, c, 0, 0,
       0, 0, 1, 0,
       0, 0, 0, 1,
    ];
  },

  scaling: function(sx, sy, sz) {
    return [
      sx, 0,  0,  0,
      0, sy,  0,  0,
      0,  0, sz,  0,
      0,  0,  0,  1,
    ];
  },

  translate: function(m, tx, ty, tz) {
    return m4.multiply(m, m4.translation(tx, ty, tz));
  },

  translate2: function(m, tx, ty, tz) {
    return m4.multiply(m, m4.translation_bezier(tx, ty, tz));
  },

  //refer: http://www.lapix.ufsc.br/ensino/computacao-grafica/transformacoes-geometricas-2d-e-coordenadas-homogeneas/#Qual_ponto_arbitrario_escolher
  point_rotate: function(m, angleInRadians, px, py, pz) {
    matrix = m4.multiply(m, m4.translation(-px, -py, -pz));
    matrix = m4.multiply(matrix, m4.point_Rotation(angleInRadians));
    return m4.multiply(matrix, m4.translation(px, py, pz));
  },

  xRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.xRotation(angleInRadians));
  },

  yRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.yRotation(angleInRadians));
  },

  zRotate: function(m, angleInRadians) {
    return m4.multiply(m, m4.zRotation(angleInRadians));
  },

  scale: function(m, sx, sy, sz) {
    return m4.multiply(m, m4.scaling(sx, sy, sz));
  },

  inverse: function(m) {
    var m00 = m[0 * 4 + 0];
    var m01 = m[0 * 4 + 1];
    var m02 = m[0 * 4 + 2];
    var m03 = m[0 * 4 + 3];
    var m10 = m[1 * 4 + 0];
    var m11 = m[1 * 4 + 1];
    var m12 = m[1 * 4 + 2];
    var m13 = m[1 * 4 + 3];
    var m20 = m[2 * 4 + 0];
    var m21 = m[2 * 4 + 1];
    var m22 = m[2 * 4 + 2];
    var m23 = m[2 * 4 + 3];
    var m30 = m[3 * 4 + 0];
    var m31 = m[3 * 4 + 1];
    var m32 = m[3 * 4 + 2];
    var m33 = m[3 * 4 + 3];
    var tmp_0  = m22 * m33;
    var tmp_1  = m32 * m23;
    var tmp_2  = m12 * m33;
    var tmp_3  = m32 * m13;
    var tmp_4  = m12 * m23;
    var tmp_5  = m22 * m13;
    var tmp_6  = m02 * m33;
    var tmp_7  = m32 * m03;
    var tmp_8  = m02 * m23;
    var tmp_9  = m22 * m03;
    var tmp_10 = m02 * m13;
    var tmp_11 = m12 * m03;
    var tmp_12 = m20 * m31;
    var tmp_13 = m30 * m21;
    var tmp_14 = m10 * m31;
    var tmp_15 = m30 * m11;
    var tmp_16 = m10 * m21;
    var tmp_17 = m20 * m11;
    var tmp_18 = m00 * m31;
    var tmp_19 = m30 * m01;
    var tmp_20 = m00 * m21;
    var tmp_21 = m20 * m01;
    var tmp_22 = m00 * m11;
    var tmp_23 = m10 * m01;

    var t0 = (tmp_0 * m11 + tmp_3 * m21 + tmp_4 * m31) -
             (tmp_1 * m11 + tmp_2 * m21 + tmp_5 * m31);
    var t1 = (tmp_1 * m01 + tmp_6 * m21 + tmp_9 * m31) -
             (tmp_0 * m01 + tmp_7 * m21 + tmp_8 * m31);
    var t2 = (tmp_2 * m01 + tmp_7 * m11 + tmp_10 * m31) -
             (tmp_3 * m01 + tmp_6 * m11 + tmp_11 * m31);
    var t3 = (tmp_5 * m01 + tmp_8 * m11 + tmp_11 * m21) -
             (tmp_4 * m01 + tmp_9 * m11 + tmp_10 * m21);

    var d = 1.0 / (m00 * t0 + m10 * t1 + m20 * t2 + m30 * t3);

    return [
      d * t0,
      d * t1,
      d * t2,
      d * t3,
      d * ((tmp_1 * m10 + tmp_2 * m20 + tmp_5 * m30) -
           (tmp_0 * m10 + tmp_3 * m20 + tmp_4 * m30)),
      d * ((tmp_0 * m00 + tmp_7 * m20 + tmp_8 * m30) -
           (tmp_1 * m00 + tmp_6 * m20 + tmp_9 * m30)),
      d * ((tmp_3 * m00 + tmp_6 * m10 + tmp_11 * m30) -
           (tmp_2 * m00 + tmp_7 * m10 + tmp_10 * m30)),
      d * ((tmp_4 * m00 + tmp_9 * m10 + tmp_10 * m20) -
           (tmp_5 * m00 + tmp_8 * m10 + tmp_11 * m20)),
      d * ((tmp_12 * m13 + tmp_15 * m23 + tmp_16 * m33) -
           (tmp_13 * m13 + tmp_14 * m23 + tmp_17 * m33)),
      d * ((tmp_13 * m03 + tmp_18 * m23 + tmp_21 * m33) -
           (tmp_12 * m03 + tmp_19 * m23 + tmp_20 * m33)),
      d * ((tmp_14 * m03 + tmp_19 * m13 + tmp_22 * m33) -
           (tmp_15 * m03 + tmp_18 * m13 + tmp_23 * m33)),
      d * ((tmp_17 * m03 + tmp_20 * m13 + tmp_23 * m23) -
           (tmp_16 * m03 + tmp_21 * m13 + tmp_22 * m23)),
      d * ((tmp_14 * m22 + tmp_17 * m32 + tmp_13 * m12) -
           (tmp_16 * m32 + tmp_12 * m12 + tmp_15 * m22)),
      d * ((tmp_20 * m32 + tmp_12 * m02 + tmp_19 * m22) -
           (tmp_18 * m22 + tmp_21 * m32 + tmp_13 * m02)),
      d * ((tmp_18 * m12 + tmp_23 * m32 + tmp_15 * m02) -
           (tmp_22 * m32 + tmp_14 * m02 + tmp_19 * m12)),
      d * ((tmp_22 * m22 + tmp_16 * m02 + tmp_21 * m12) -
           (tmp_20 * m12 + tmp_23 * m22 + tmp_17 * m02)),
    ];
  },

  cross: function(a, b) {
    return [
       a[1] * b[2] - a[2] * b[1],
       a[2] * b[0] - a[0] * b[2],
       a[0] * b[1] - a[1] * b[0],
    ];
  },

  subtractVectors: function(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  },

  normalize: function(v) {
    var length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    // make sure we don't divide by 0.
    if (length > 0.00001) {
      return [v[0] / length, v[1] / length, v[2] / length];
    } else {
      return [0, 0, 0];
    }
  },

  lookAt: function(cameraPosition, target, up) {
    var zAxis = m4.normalize(
        m4.subtractVectors(cameraPosition, target));
    var xAxis = m4.normalize(m4.cross(up, zAxis));
    var yAxis = m4.normalize(m4.cross(zAxis, xAxis));

    return [
      xAxis[0], xAxis[1], xAxis[2], 0,
      yAxis[0], yAxis[1], yAxis[2], 0,
      zAxis[0], zAxis[1], zAxis[2], 0,
      cameraPosition[0],
      cameraPosition[1],
      cameraPosition[2],
      1,
    ];
  },

  transformVector: function(m, v) {
    var dst = [];
    for (var i = 0; i < 4; ++i) {
      dst[i] = 0.0;
      for (var j = 0; j < 4; ++j) {
        dst[i] += v[j] * m[j * 4 + i];
      }
    }
    return dst;
  },
};

main();