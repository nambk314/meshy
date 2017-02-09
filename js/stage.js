// Main class representing the Meshy viewport.
// Encompasses:
//   UI interaction
//   displayed meshes (imported and floor mesh)

Stage = function() {
  // params
  this.floorSize = 50;

  // toggles
  this.uploadEnabled = true;
  this.floorVisible = true;

  // geometry
  this.model = null;
  this.fileInput = document.getElementById("file");

  // webgl viewport
  this.container = null;
  this.camera = null;
  this.scene = null;
  this.renderer = null;
  this.axisWidget = null;

  // undo stack
  this.undoStack = new UndoStack();

  // UI
  this.generateUI();
}

Stage.prototype.generateUI = function() {
  this.gui = new dat.GUI();
  this.gui.add(this, 'upload');

  var uiFolder = this.gui.addFolder("UI");
  uiFolder.add(this, "floorVisible").onChange(updateFloor);
  var transformationFolder = this.gui.addFolder("Transformation");
  var translationFolder = transformationFolder.addFolder("Translation");
  this.xTranslation = 0;
  translationFolder.add(this, "xTranslation", -50, 50);
  translationFolder.add(this, "translateX");
  this.yTranslation = 0;
  translationFolder.add(this, "yTranslation", -50, 50);
  translationFolder.add(this, "translateY");
  this.zTranslation = 0;
  translationFolder.add(this, "zTranslation", -50, 50);
  translationFolder.add(this, "translateZ");
  var rotationFolder = transformationFolder.addFolder("Rotation");
  this.xRotation = 0;
  rotationFolder.add(this, "xRotation", -360,360);
  rotationFolder.add(this, "rotateX");
  this.yRotation = 0;
  rotationFolder.add(this, "yRotation", -360,360);
  rotationFolder.add(this, "rotateY");
  this.zRotation = 0;
  rotationFolder.add(this, "zRotation", -360,360);
  rotationFolder.add(this, "rotateZ");
  var floorFolder = transformationFolder.addFolder("Floor");
  floorFolder.add(this, "floorX");
  floorFolder.add(this, "floorY");
  floorFolder.add(this, "floorZ");
  var centerFolder = transformationFolder.addFolder("Center");
  centerFolder.add(this, "centerAll");
  centerFolder.add(this, "centerX");
  centerFolder.add(this, "centerY");
  centerFolder.add(this, "centerZ");
  var displayFolder = this.gui.addFolder("Display");
  displayFolder.add(this, "toggleWireframe");
  displayFolder.add(this, "cameraToModel");
  displayFolder.add(this, "toggleAxisWidget");
  this.gui.add(this, "undo");
  this.gui.add(this, "delete");

  this.infoBox = new InfoBox();
  this.infoBox.addMultiple("x range", this, [["model","xmin"], ["model","xmax"]]);
  this.infoBox.addMultiple("y range", this, [["model","ymin"], ["model","ymax"]]);
  this.infoBox.addMultiple("z range", this, [["model","zmin"], ["model","zmax"]]);
  this.infoBox.addMultiple("Center", this, [["model", "getCenterx"],["model", "getCentery"],["model", "getCenterz"]]);

  this.initViewport();
  this.initFloor();

  var _this = this;

  function updateFloor() {
    if (_this.floorVisible) {
        _this.scene.traverse(function(o) {
          if (o.name=="floor") o.visible = true;
        });
    }
    else {
      _this.scene.traverse(function(o) {
        if (o.name=="floor") o.visible = false;
      });
    }
  }
}

Stage.prototype.updateUI = function() {
}

Stage.prototype.transform = function(op, axis, amount) {
  var transform = new Transform(op, axis, amount, this.model);
  var inv = transform.makeInverse();
  this.undoStack.push(inv);
  transform.apply();
}

Stage.prototype.undo = function() { this.undoStack.undo(); }

Stage.prototype.translateX = function() { this.transform("translate","x",this.xTranslation); }
Stage.prototype.translateY = function() { this.transform("translate","y",this.yTranslation); }
Stage.prototype.translateZ = function() { this.transform("translate","z",this.zTranslation); }
Stage.prototype.rotateX = function() { this.transform("rotate","x",this.xRotation); }
Stage.prototype.rotateY = function() { this.transform("rotate","y",this.yRotation); }
Stage.prototype.rotateZ = function() { this.transform("rotate","z",this.zRotation); }
Stage.prototype.floorX = function() { this.transform("floor","x",null); }
Stage.prototype.floorY = function() { this.transform("floor","y",null); }
Stage.prototype.floorZ = function() { this.transform("floor","z",null); }
Stage.prototype.centerX = function() { this.transform("center","x",null); }
Stage.prototype.centerY = function() { this.transform("center","y",null); }
Stage.prototype.centerZ = function() { this.transform("center","z",null); }
Stage.prototype.centerAll = function() { this.transform("center","all",null); }

Stage.prototype.toggleWireframe = function() {
  this.transform("toggleWireframe",null,null,this.model);
}
Stage.prototype.toggleAxisWidget = function() {
  this.axisWidget.toggleVisibility();
}

Stage.prototype.initViewport = function() {
  var width, height;
  var _this = this;

  init();
  animate();

  function init() {
    _this.container = document.getElementById('container');
    height = container.offsetHeight;
    width = container.offsetWidth;

    _this.camera = new THREE.PerspectiveCamera(30, width/height, .1, 100000);

    _this.scene = new THREE.Scene();
    _this.scene.background = new THREE.Color(0x222222);

    _this.controls = new Controls(
      _this.camera,
      _this.container,
      {
        r: 10,
        phi: Math.PI/3,
        theta: 5*Math.PI/12
      }
    );

    var pointLight = new THREE.PointLight(0xffffff, 3, 0, 1);
    _this.scene.add(pointLight);
    _this.controls.addObject(pointLight);
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    _this.scene.add(ambientLight);

    _this.axisWidget = new AxisWidget(_this.camera);

    _this.controls.update();

    /* RENDER */
    _this.renderer = new THREE.WebGLRenderer({ antialias: true });
    _this.renderer.shadowMap.enabled = true;
    _this.renderer.toneMapping = THREE.ReinhardToneMapping;
    _this.renderer.setPixelRatio(window.devicePixelRatio);
    _this.renderer.setSize(width, height);
    _this.container.appendChild(_this.renderer.domElement);

    addEventListeners();
  }

  function addEventListeners() {
    window.addEventListener('resize', onWindowResize, false);
  }

  function onWindowResize() {
    height = _this.container.offsetHeight;
    width = _this.container.offsetWidth;
    _this.camera.aspect = width / height;
    _this.camera.updateProjectionMatrix();

    _this.renderer.setSize(width, height);
  }

  function animate() {
    requestAnimationFrame(animate);
    render();
  }

  function render() {
    if (!_this.camera || !_this.scene) return;
    _this.controls.update();
    _this.axisWidget.update();
    _this.infoBox.update();
    _this.renderer.render(_this.scene, _this.camera);
  }
}

Stage.prototype.initFloor = function() {
  var size = this.floorSize;

  // Primary: center line through origin
  // Secondary: lines along multiples of 5
  // Tertiary: everything else
  var geoPrimary = new THREE.Geometry();
  var matPrimary = new THREE.LineBasicMaterial({
    color: 0xdddddd,
    linewidth: 1
  });
  var geoSecondary = new THREE.Geometry();
  var matSecondary = new THREE.LineBasicMaterial({
    color: 0x777777,
    linewidth: 1
  });
  var geoTertiary = new THREE.Geometry();
  var matTertiary = new THREE.LineBasicMaterial({
    color: 0x444444,
    linewidth: 1
  });

  geoPrimary.vertices.push(new THREE.Vector3(0,0,-size));
  geoPrimary.vertices.push(new THREE.Vector3(0,0,size));
  geoPrimary.vertices.push(new THREE.Vector3(-size,0,0));
  geoPrimary.vertices.push(new THREE.Vector3(size,0,0));
  for (var i=-size; i<=size; i++) {
    if (i==0) continue;
    if (i%5==0) {
      geoSecondary.vertices.push(new THREE.Vector3(i,0,-size));
      geoSecondary.vertices.push(new THREE.Vector3(i,0,size));
      geoSecondary.vertices.push(new THREE.Vector3(-size,0,i));
      geoSecondary.vertices.push(new THREE.Vector3(size,0,i));
    }
    else {
      geoTertiary.vertices.push(new THREE.Vector3(i,0,-size));
      geoTertiary.vertices.push(new THREE.Vector3(i,0,size));
      geoTertiary.vertices.push(new THREE.Vector3(-size,0,i));
      geoTertiary.vertices.push(new THREE.Vector3(size,0,i));
    }
  }
  var linePrimary = new THREE.LineSegments(geoPrimary, matPrimary);
  var lineSecondary = new THREE.LineSegments(geoSecondary, matSecondary);
  var lineTertiary = new THREE.LineSegments(geoTertiary, matTertiary);
  linePrimary.name = "floor";
  lineSecondary.name = "floor";
  lineTertiary.name = "floor";
  this.scene.add(linePrimary);
  this.scene.add(lineSecondary);
  this.scene.add(lineTertiary);
}

Stage.prototype.upload = function() {
  if (this.model) {
    console.log("A model already exists");
    return;
  }

  if (this.fileInput) {
    this.fileInput.click();
  }
}

Stage.prototype.handleFile = function(file) {
  this.model = new Model();
  this.model.upload(file, this.displayMesh.bind(this));
};

Stage.prototype.delete = function() {
  // it's necessary to clear file input box because it blocks uploading
  // a model with the same name twice in a row
  this.fileInput.value = "";

  if (this.model) {
    this.model.deleteGeometry();
  }
  else {
    console.log("No model to delete.");
    return;
  }
  this.model = null;
  this.undoStack.clear();
}

Stage.prototype.displayMesh = function() {
  this.model.render(this.scene, "plain");
  this.cameraToModel();
}

Stage.prototype.cameraToModel = function() {
  if (!this.model) return;
  var center = this.model.getCenter();
  this.controls.update( {origin: new THREE.Vector3(center[0],center[1],center[2])} );
}
