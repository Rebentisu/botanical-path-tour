
/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
'use strict';

(function() {

  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var data = window.APP_DATA;

  // DOM elements
  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  // Desktop / mobile mode
  if (window.matchMedia) {
    var mql = window.matchMedia(
      "(max-width: 500px), (max-height: 500px)"
    );

    var setMode = function() {
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };

    setMode();

    if (mql.addEventListener) {
      mql.addEventListener('change', setMode);
    } else {
      mql.addListener(setMode);
    }
  } else {
    document.body.classList.add('desktop');
  }

  // Touch detection
  document.body.classList.add('no-touch');

  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  // =====================================================
  // INITIALIZE MARZIPANO
  // =====================================================

  var viewerOpts = {
    controls: {
      mouseViewMode: data.settings.mouseViewMode
    }
  };

  var viewer = new Marzipano.Viewer(
    panoElement,
    viewerOpts
  );

  // =====================================================
  // CREATE PANORAMAS
  // =====================================================

  var scenes = data.scenes.map(function(sceneData) {

    var urlPrefix = "tiles";

    var source = Marzipano.ImageUrlSource.fromString(
      urlPrefix + "/" + sceneData.id +
      "/{z}/{f}/{y}/{x}.jpg",
      {
        cubeMapPreviewUrl:
          urlPrefix + "/" + sceneData.id + "/preview.jpg"
      }
    );

    var geometry = new Marzipano.CubeGeometry(
      sceneData.levels
    );

    // Preserve original zoom limits
    var limiter = Marzipano.RectilinearView.limit.traditional(
      sceneData.faceSize,
      100 * Math.PI / 180,
      120 * Math.PI / 180
    );

    var view = new Marzipano.RectilinearView(
      sceneData.initialViewParameters,
      limiter
    );

    var scene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    // Navigation hotspots
    sceneData.linkHotspots.forEach(function(hotspot) {
      var element = createLinkHotspotElement(hotspot);

      scene.hotspotContainer().createHotspot(
        element,
        {
          yaw: hotspot.yaw,
          pitch: hotspot.pitch
        }
      );
    });

    // Information hotspots
    sceneData.infoHotspots.forEach(function(hotspot) {
      var element = createInfoHotspotElement(hotspot);

      scene.hotspotContainer().createHotspot(
        element,
        {
          yaw: hotspot.yaw,
          pitch: hotspot.pitch
        }
      );
    });

    return {
      data: sceneData,
      scene: scene,
      view: view
    };
  });

  // =====================================================
  // AUTOROTATE
  // =====================================================

  var autorotate = Marzipano.autorotate({
    yawSpeed: 0.03,
    targetPitch: 0,
    targetFov: Math.PI / 2
  });

  if (data.settings.autorotateEnabled) {
    autorotateToggleElement.classList.add('enabled');
  }

  autorotateToggleElement.addEventListener(
    'click',
    toggleAutorotate
  );

  // =====================================================
  // FULLSCREEN
  // =====================================================

  if (screenfull.enabled && data.settings.fullscreenButton) {

    document.body.classList.add('fullscreen-enabled');

    fullscreenToggleElement.addEventListener(
      'click',
      function() {
        screenfull.toggle();
      }
    );

    screenfull.on('change', function() {
      if (screenfull.isFullscreen) {
        fullscreenToggleElement.classList.add('enabled');
      } else {
        fullscreenToggleElement.classList.remove('enabled');
      }
    });

  } else {
    document.body.classList.add('fullscreen-disabled');
  }

  // =====================================================
  // SCENE LIST
  // =====================================================

  sceneListToggleElement.addEventListener(
    'click',
    toggleSceneList
  );

  if (!document.body.classList.contains('mobile')) {
    showSceneList();
  }

  scenes.forEach(function(scene) {

    var el = document.querySelector(
      '#sceneList .scene[data-id="' +
      scene.data.id + '"]'
    );

    el.addEventListener('click', function() {

      switchScene(scene);

      if (document.body.classList.contains('mobile')) {
        hideSceneList();
      }
    });
  });

  // =====================================================
  // MANUAL VIEW AND ZOOM CONTROLS
  // =====================================================

  var viewUpElement = document.querySelector('#viewUp');
  var viewDownElement = document.querySelector('#viewDown');
  var viewLeftElement = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement = document.querySelector('#viewIn');
  var viewOutElement = document.querySelector('#viewOut');

  var velocity = 0.7;
  var friction = 3;

  var controls = viewer.controls();

  controls.registerMethod(
    'upElement',
    new Marzipano.ElementPressControlMethod(
      viewUpElement, 'y', -velocity, friction
    ),
    true
  );

  controls.registerMethod(
    'downElement',
    new Marzipano.ElementPressControlMethod(
      viewDownElement, 'y', velocity, friction
    ),
    true
  );

  controls.registerMethod(
    'leftElement',
    new Marzipano.ElementPressControlMethod(
      viewLeftElement, 'x', -velocity, friction
    ),
    true
  );

  controls.registerMethod(
    'rightElement',
    new Marzipano.ElementPressControlMethod(
      viewRightElement, 'x', velocity, friction
    ),
    true
  );

  controls.registerMethod(
    'inElement',
    new Marzipano.ElementPressControlMethod(
      viewInElement, 'zoom', -velocity, friction
    ),
    true
  );

  controls.registerMethod(
    'outElement',
    new Marzipano.ElementPressControlMethod(
      viewOutElement, 'zoom', velocity, friction
    ),
    true
  );

  function sanitize(s) {
    return s.replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;');
  }

  // =====================================================
  // SMOOTH CROSSFADE TRANSITION
  //
  // NO AUTOMATIC ZOOM
  // NO CAMERA TURN TOWARD NAVIGATION ARROW
  // DIRECTION-AWARE ARRIVAL PRESERVED
  // =====================================================

  var isTransitioning = false;

  // Duration of crossfade in milliseconds
  var fadeDuration = 400;

  // =====================================================
  // CALCULATE ARRIVAL DIRECTION
  // =====================================================

  function getArrivalView(
    destinationScene,
    previousScene,
    hotspot
  ) {

    var initial =
      destinationScene.data.initialViewParameters;

    // Initial load or scene-list navigation
    if (!previousScene || !hotspot) {
      return initial;
    }

    // Identify previous scene
    var previousId = null;

    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].scene === previousScene) {
        previousId = scenes[i].data.id;
        break;
      }
    }

    if (previousId === null) {
      return initial;
    }

    // Find navigation arrow back to previous scene
    var links = destinationScene.data.linkHotspots;

    for (var j = 0; j < links.length; j++) {

      if (links[j].target === previousId) {

        // Face away from the return arrow
        var oppositeYaw = links[j].yaw + Math.PI;

        var arrivalYaw = Math.atan2(
          Math.sin(oppositeYaw),
          Math.cos(oppositeYaw)
        );

        return {
          yaw: arrivalYaw,
          pitch: initial.pitch,
          fov: initial.fov
        };
      }
    }

    return initial;
  }

  // =====================================================
  // SWITCH PANORAMA
  // DIRECT CROSSFADE - NO CAMERA APPROACH
  // =====================================================

  function switchScene(scene, hotspot) {

    if (!scene || isTransitioning) {
      return;
    }

    var currentScene = viewer.scene();

    if (currentScene === scene.scene) {
      return;
    }

    stopAutorotate();

    isTransitioning = true;

    // Calculate the arrival direction
    var arrivalView = getArrivalView(
      scene,
      currentScene,
      hotspot
    );

    // Open destination at normal zoom
    scene.view.setParameters(arrivalView);

    // Switch directly to destination.
    // No lookTo() camera movement is performed.
    scene.scene.switchTo(
      {
        transitionDuration:
          currentScene ? fadeDuration : 0
      },
      function() {
        isTransitioning = false;
        startAutorotate();
      }
    );

    // Update interface
    updateSceneName(scene);
    updateSceneList(scene);
  }

  // =====================================================
  // UPDATE SCENE NAME AND SCENE LIST
  // =====================================================

  function updateSceneName(scene) {
    sceneNameElement.innerHTML =
      sanitize(scene.data.name);
  }

  function updateSceneList(scene) {

    for (var i = 0; i < sceneElements.length; i++) {

      var el = sceneElements[i];

      if (el.getAttribute('data-id') === scene.data.id) {
        el.classList.add('current');
      } else {
        el.classList.remove('current');
      }
    }
  }

  function showSceneList() {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  function hideSceneList() {
    sceneListElement.classList.remove('enabled');
    sceneListToggleElement.classList.remove('enabled');
  }

  function toggleSceneList() {
    sceneListElement.classList.toggle('enabled');
    sceneListToggleElement.classList.toggle('enabled');
  }

  // =====================================================
  // AUTOROTATE FUNCTIONS
  // =====================================================

  function startAutorotate() {

    if (!autorotateToggleElement.classList.contains('enabled')) {
      return;
    }

    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
  }

  function stopAutorotate() {
    viewer.stopMovement();
    viewer.setIdleMovement(Infinity);
  }

  function toggleAutorotate() {

    if (autorotateToggleElement.classList.contains('enabled')) {

      autorotateToggleElement.classList.remove('enabled');
      stopAutorotate();

    } else {

      autorotateToggleElement.classList.add('enabled');
      startAutorotate();
    }
  }

  // =====================================================
  // NAVIGATION HOTSPOTS
  // =====================================================

  function createLinkHotspotElement(hotspot) {

    var wrapper = document.createElement('div');

    wrapper.classList.add('hotspot');
    wrapper.classList.add('link-hotspot');

    var icon = document.createElement('img');

    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');

    // Preserve arrow rotation
    var transformProperties = [
      '-ms-transform',
      '-webkit-transform',
      'transform'
    ];

    for (var i = 0; i < transformProperties.length; i++) {

      var property = transformProperties[i];

      icon.style[property] =
        'rotate(' + hotspot.rotation + 'rad)';
    }

    // Navigate using direct crossfade
    wrapper.addEventListener('click', function() {

      switchScene(
        findSceneById(hotspot.target),
        hotspot
      );
    });

    stopTouchAndScrollEventPropagation(wrapper);

    // Original tooltip (hidden by your CSS)
    var tooltip = document.createElement('div');

    tooltip.classList.add('hotspot-tooltip');
    tooltip.classList.add('link-hotspot-tooltip');

    tooltip.innerHTML =
      findSceneDataById(hotspot.target).name;

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

  // =====================================================
  // INFORMATION HOTSPOTS
  // =====================================================

  function createInfoHotspotElement(hotspot) {

    var wrapper = document.createElement('div');

    wrapper.classList.add('hotspot');
    wrapper.classList.add('info-hotspot');

    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    // Icon
    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');

    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');

    iconWrapper.appendChild(icon);

    // Title
    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');

    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.innerHTML = hotspot.title;

    titleWrapper.appendChild(title);

    // Close button
    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');

    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');

    closeWrapper.appendChild(closeIcon);

    // Build header
    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    // Information text
    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    text.innerHTML = hotspot.text;

    wrapper.appendChild(header);
    wrapper.appendChild(text);

    // Mobile modal
    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');

    document.body.appendChild(modal);

    var toggle = function() {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };

    wrapper.querySelector(
      '.info-hotspot-header'
    ).addEventListener('click', toggle);

    modal.querySelector(
      '.info-hotspot-close-wrapper'
    ).addEventListener('click', toggle);

    stopTouchAndScrollEventPropagation(wrapper);

    return wrapper;
  }

  // =====================================================
  // STOP EVENT PROPAGATION
  // =====================================================

  function stopTouchAndScrollEventPropagation(element) {

    var eventList = [
      'touchstart',
      'touchmove',
      'touchend',
      'touchcancel',
      'wheel',
      'mousewheel'
    ];

    for (var i = 0; i < eventList.length; i++) {

      element.addEventListener(
        eventList[i],
        function(event) {
          event.stopPropagation();
        }
      );
    }
  }

  // =====================================================
  // FIND SCENES
  // =====================================================

  function findSceneById(id) {

    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }

    return null;
  }

  function findSceneDataById(id) {

    for (var i = 0; i < data.scenes.length; i++) {
      if (data.scenes[i].id === id) {
        return data.scenes[i];
      }
    }

    return null;
  }

  // =====================================================
  // INITIAL PANORAMA
  // =====================================================

  switchScene(scenes[0]);

})();
