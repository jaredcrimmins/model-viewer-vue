import {
	EventDispatcher,
	MOUSE,
	Quaternion,
	Spherical,
	TOUCH,
  Matrix4,
  OrthographicCamera,
  PerspectiveCamera,
	Vector2,
	Vector3
} from 'three';
import {clamp} from '../utils';

const STATE = {
  NONE: - 1,
  ROTATE: 0,
  DOLLY: 1,
  PAN: 2,
  TOUCH_ROTATE: 3,
  TOUCH_PAN: 4,
  TOUCH_DOLLY_PAN: 5,
  TOUCH_DOLLY_ROTATE: 6
};

const EPS = 0.000001;

// current position in spherical coordinates
const spherical = new Spherical();
const nextSpherical = new Spherical();

let scale = 1;
const panOffset = new Vector3();
let zoomChanged = false;

const rotateStart = new Vector2();
const rotateEnd = new Vector2();
const rotateDelta = new Vector2();

const panStart = new Vector2();
const panEnd = new Vector2();
const panDelta = new Vector2();

const dollyStart = new Vector2();
const dollyEnd = new Vector2();
const dollyDelta = new Vector2();

const pointers: PointerEvent[] = [];
const pointerPositions: Vector2[] = [];

let state = STATE.NONE;

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction camera.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move

const _changeEvent = {type: 'change'};
const _startEvent = {type: 'start'};
const _endEvent = {type: 'end'};

export class OrbitControls extends EventDispatcher {
  protected domElementKeyEvents: HTMLElement | null;
  autoRotate: boolean;
  autoRotateSpeed: number;
  camera: OrthographicCamera | PerspectiveCamera;
  dampingFactor: number;
  domElement: HTMLElement;
  enableDamping: boolean;
  enablePan: boolean;
  enableRotate: boolean;
  /** This option enables dollying in and out */
  enableZoom: boolean;
  enabled: boolean;
  keyPanSpeed: number;
  keys: {LEFT: string; UP: string; RIGHT: string; BOTTOM: string};
  maxAzimuthAngle: number;
  maxDistance: number;
  maxPolarAngle: number;
  maxZoom: number;
  minAzimuthAngle: number;
  minDistance: number;
  minPolarAngle: number;
  minZoom: number;
  mouseButtons: {LEFT: MOUSE; MIDDLE: MOUSE; RIGHT: MOUSE};
  panSpeed: number;
  position0: Vector3;
  rotateSpeed: number;
  screenSpacePanning: boolean;
  target: Vector3;
  target0: Vector3;
  touches: {ONE: TOUCH; TWO: TOUCH};
  zoom0: number;
  zoomSpeed: number;

	constructor(camera: OrthographicCamera | PerspectiveCamera, domElement: HTMLElement) {
		super();

		this.camera = camera;
		this.domElement = domElement;
		this.domElement.style.touchAction = 'none'; // disable touch scroll

		// Set to false to disable this control
		this.enabled = true;

		// "target" sets the location of focus, where the camera orbits around
		this.target = new Vector3();

		// How far you can dolly in and out ( PerspectiveCamera only )
		this.minDistance = 0;
		this.maxDistance = Infinity;

		// How far you can zoom in and out ( OrthographicCamera only )
		this.minZoom = 0;
		this.maxZoom = Infinity;

		// How far you can orbit vertically, upper and lower limits.
		// Range is 0 to Math.PI radians.
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians

		// How far you can orbit horizontally, upper and lower limits.
		// If set, the interval [ min, max ] must be a sub-interval of [ - 2 PI, 2 PI ], with ( max - min < 2 PI )
		this.minAzimuthAngle = -Infinity; // radians
		this.maxAzimuthAngle = Infinity; // radians

		// Set to true to enable damping (inertia)
		// If damping is enabled, you must call controls.update() in your animation loop
		this.enableDamping = false;
		this.dampingFactor = 0.05;

		// This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
		// Set to false to disable zooming
		this.enableZoom = true;
		this.zoomSpeed = 1.0;

		// Set to false to disable rotating
		this.enableRotate = true;
		this.rotateSpeed = 1.0;

		// Set to false to disable panning
		this.enablePan = true;
		this.panSpeed = 1.0;
		this.screenSpacePanning = true; // if false, pan orthogonal to world-space direction camera.up
		this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

		// Set to true to automatically rotate around the target
		// If auto-rotate is enabled, you must call controls.update() in your animation loop
		this.autoRotate = false;
		this.autoRotateSpeed = 2.0; // 30 seconds per orbit when fps is 60

		// The four arrow keys
		this.keys = {LEFT: 'ArrowLeft', UP: 'ArrowUp', RIGHT: 'ArrowRight', BOTTOM: 'ArrowDown'};

		// Mouse buttons
		this.mouseButtons = {LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN};

		// Touch fingers
		this.touches = {ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN};

		// for reset
		this.target0 = this.target.clone();
		this.position0 = this.camera.position.clone();
		this.zoom0 = this.camera.zoom;

		// the target DOM element for key events
		this.domElementKeyEvents = null;

    this.domElement.addEventListener('contextmenu', event => this.onContextMenu(event));

		this.domElement.addEventListener('pointerdown', event => this.onPointerDown(event));
		this.domElement.addEventListener('pointercancel', event => this.onPointerCancel(event));
		this.domElement.addEventListener('wheel', event => this.onMouseWheel(event), {passive: false});

		// force an update at start

		this.update();
  }

	getPolarAngle() {
    return spherical.phi;
	}

  getAzimuthalAngle() {
    return spherical.theta;
	}

	getDistance() {
    return this.camera.position.distanceTo(this.target);
  }

  listenToKeyEvents(domElement: HTMLElement) {
    domElement.addEventListener('keydown', event => this.onKeyDown(event));
    this.domElementKeyEvents = domElement;
  }

	saveState() {
    this.target0.copy(this.target);
    this.position0.copy(this.camera.position);
    this.zoom0 = this.camera.zoom;
	}

	reset() {
    this.target.copy(this.target0);
    this.camera.position.copy(this.position0);
    this.camera.zoom = this.zoom0;

    this.camera.updateProjectionMatrix();
    this.dispatchEvent(_changeEvent);

    this.update();

    state = STATE.NONE;
  }

	update() {
    const offset = new Vector3();

    // so camera.up is the orbit axis
    const quat = new Quaternion().setFromUnitVectors(this.camera.up, new Vector3(0, 1, 0));
    const quatInverse = quat.clone().invert();

    const lastPosition = new Vector3();
    const lastQuaternion = new Quaternion();

    const twoPi = 2 * Math.PI;
    const position = this.camera.position;

    offset.copy(position).sub(this.target);

    // rotate offset to "y-axis-is-up" space
    offset.applyQuaternion(quat);

    // angle from z-axis around y-axis
    spherical.setFromVector3(offset);

    if (this.autoRotate && state === STATE.NONE) {
      this.rotateLeft(this.getAutoRotationAngle());
    }

    if (this.enableDamping) {
      spherical.theta += nextSpherical.theta * this.dampingFactor;
      spherical.phi += nextSpherical.phi * this.dampingFactor;
    } else {
      spherical.theta = nextSpherical.theta;
      spherical.phi = nextSpherical.phi;
    }

    // restrict theta to be between desired limits

    let min = this.minAzimuthAngle;
    let max = this.maxAzimuthAngle;

    if (isFinite(min) && isFinite(max)) {
      if (min < -Math.PI) min += twoPi;
      else if (min > Math.PI) min -= twoPi;

      if (max < -Math.PI) max += twoPi;
      else if (max > Math.PI) max -= twoPi;

      if (min <= max) {
        spherical.theta = Math.max(min, Math.min(max, spherical.theta));
      } else {
        spherical.theta = (spherical.theta > (min + max) / 2) ?
          Math.max(min, spherical.theta) :
          Math.min(max, spherical.theta);
      }
    }

    // restrict phi to be between desired limits
    spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, spherical.phi));

    spherical.makeSafe();


    spherical.radius *= scale;

    // restrict radius to be between desired limits
    spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, spherical.radius));

    // move target to panned location

    if (this.enableDamping) {
      this.target.addScaledVector(panOffset, this.dampingFactor);
    } else this.target.add(panOffset);

    offset.setFromSpherical(spherical);

    // rotate offset back to "camera-up-vector-is-up" space
    offset.applyQuaternion(quatInverse);

    position.copy(this.target).add(offset);

    this.camera.lookAt(this.target);

    if (this.enableDamping) {
      nextSpherical.theta *= (1 - this.dampingFactor);
      nextSpherical.phi *= (1 - this.dampingFactor);

      panOffset.multiplyScalar(1 - this.dampingFactor);
    } else {
      // nextSpherical.set(0, 0, 0);

      panOffset.set(0, 0, 0);
    }

    scale = 1;

    // update condition is:
    // min(camera displacement, camera rotation in radians)^2 > EPS
    // using small-angle approximation cos(x/2) = 1 - x^2 / 8

    if (zoomChanged ||
      lastPosition.distanceToSquared(this.camera.position) > EPS ||
      8 * (1 - lastQuaternion.dot(this.camera.quaternion)) > EPS) {

      this.dispatchEvent(_changeEvent);

      lastPosition.copy(this.camera.position);
      lastQuaternion.copy(this.camera.quaternion);
      zoomChanged = false;

      return true;
    }

    return false;
  }

	dispose() {
    this.domElement.removeEventListener('contextmenu', event => this.onContextMenu(event));
    this.domElement.removeEventListener('pointerdown', event => this.onPointerDown(event));
    this.domElement.removeEventListener('pointercancel', event => this.onPointerCancel(event));
    this.domElement.removeEventListener('wheel', event => this.onMouseWheel(event));
    this.domElement.removeEventListener('pointermove', event => this.onPointerMove(event));
    this.domElement.removeEventListener('pointerup', event => this.onPointerUp(event));

    if (this.domElementKeyEvents !== null) {
      this.domElementKeyEvents.removeEventListener('keydown', event => this.onKeyDown(event));
    }
	}

	protected getAutoRotationAngle() {
    return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
  }

	protected getZoomScale() {
    return Math.pow(0.95, this.zoomSpeed);
  }

  protected rotateLeft(angle: number) {
    nextSpherical.theta = spherical.theta - angle;
  }

	protected rotateUp(angle: number) {
		nextSpherical.phi = spherical.phi - angle;
	}

	protected panLeft(distance: number, objectMatrix: Matrix4) {
    const v = new Vector3();

    v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
    v.multiplyScalar(-distance);

    panOffset.add(v);
	}

	protected panUp(distance: number, objectMatrix: Matrix4) {
    const v = new Vector3();

    if (this.screenSpacePanning === true) {
      v.setFromMatrixColumn(objectMatrix, 1);
    } else {
      v.setFromMatrixColumn(objectMatrix, 0);
      v.crossVectors(this.camera.up, v);
    }

    v.multiplyScalar(distance);
    panOffset.add(v);
	}

		// deltaX and deltaY are in pixels; right and down are positive
	protected pan(deltaX: number, deltaY: number) {
    const offset = new Vector3();
    const element = this.domElement;

    if (this.camera instanceof PerspectiveCamera) {
      const position = this.camera.position;

      offset.copy(position).sub(this.target);

      let targetDistance = offset.length();

      // half of the fov is center to top of screen
      targetDistance *= Math.tan((this.camera.fov / 2) * Math.PI / 180.0);

      // we use only clientHeight here so aspect ratio does not distort speed
      this.panLeft(2 * deltaX * targetDistance / element.clientHeight, this.camera.matrix);
      this.panUp(2 * deltaY * targetDistance / element.clientHeight, this.camera.matrix);
    } else if (this.camera instanceof OrthographicCamera) {
      this.panLeft(deltaX * (this.camera.right - this.camera.left) / this.camera.zoom / element.clientWidth, this.camera.matrix);
      this.panUp(deltaY * (this.camera.top - this.camera.bottom) / this.camera.zoom / element.clientHeight, this.camera.matrix);
    } else {
      // camera neither orthographic nor perspective
      console.warn('WARNING: OrbitControls encountered an unknown camera type - pan disabled.');
      this.enablePan = false;
    }
	}

	dollyOut(dollyScale: number) {
    console.log('dollyOut');
    if (this.camera instanceof PerspectiveCamera) {
      scale /= dollyScale;
    } else if (this.camera instanceof OrthographicCamera) {
      this.camera.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.camera.zoom * dollyScale));
      this.camera.updateProjectionMatrix();
      zoomChanged = true;
    } else {
      console.warn('WARNING: OrbitControls encountered an unknown camera type - dolly/zoom disabled.');
      this.enableZoom = false;
    }
	}

	dollyIn(dollyScale: number) {
    if (this.camera instanceof PerspectiveCamera) {
      scale *= dollyScale;
    } else if (this.camera instanceof OrthographicCamera) {
      this.camera.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.camera.zoom / dollyScale));
      this.camera.updateProjectionMatrix();
      zoomChanged = true;
    } else {
      console.warn('WARNING: OrbitControls encountered an unknown camera type - dolly/zoom disabled.');
      this.enableZoom = false;
    }
  }

  setOrbit(goalTheta: number, goalPhi: number) {
    const nextTheta = clamp(goalTheta, this.minAzimuthAngle!, this.maxAzimuthAngle!);
    const nextPhi = clamp(goalPhi, this.minPolarAngle, this.maxPolarAngle);

    nextSpherical.theta = nextTheta;
    nextSpherical.phi = nextPhi;
    nextSpherical.makeSafe();

    this.update();

    return true;
  }

  protected wrapAngle(radians: number): number {
    const normalized = (radians + Math.PI) / (2 * Math.PI);
    const wrapped = normalized - Math.floor(normalized);

    return wrapped * 2 * Math.PI - Math.PI;
  }

  //
  // event callbacks - update the object state
  //

	protected handleMouseDownRotate(event: MouseEvent) {
		rotateStart.set(event.clientX, event.clientY);
	}

	protected handleMouseDownDolly(event: MouseEvent) {
		dollyStart.set(event.clientX, event.clientY);
	}

  protected handleMouseDownPan(event: MouseEvent) {
		panStart.set(event.clientX, event.clientY);
	}

	protected handleMouseMoveRotate(event: MouseEvent) {
    rotateEnd.set(event.clientX, event.clientY);

    rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(this.rotateSpeed);

    const element = this.domElement;

    this.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight); // yes, height

    this.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);

    rotateStart.copy(rotateEnd);

    this.update();
	}

  protected handleMouseMoveDolly(event: MouseEvent) {
    dollyEnd.set(event.clientX, event.clientY);

    dollyDelta.subVectors(dollyEnd, dollyStart);

    if (dollyDelta.y > 0) {
      this.dollyOut(this.getZoomScale());
    } else if (dollyDelta.y < 0) {
      this.dollyIn(this.getZoomScale());
    }

    dollyStart.copy(dollyEnd);

    this.update();
	}

	protected handleMouseMovePan(event: MouseEvent) {
    panEnd.set(event.clientX, event.clientY);

    panDelta.subVectors(panEnd, panStart).multiplyScalar(this.panSpeed);

    this.pan(panDelta.x, panDelta.y);

    panStart.copy(panEnd);

    this.update();
	}

	protected handleMouseWheel(event: WheelEvent) {
    if (event.deltaY < 0) {
      this.dollyIn(this.getZoomScale());
    } else if (event.deltaY > 0) {
      this.dollyOut(this.getZoomScale());
    }

    this.update();
  }

  protected handleKeyDown(event: KeyboardEvent) {
    let needsUpdate = false;

    switch (event.code) {
      case this.keys.UP:
        this.pan(0, this.keyPanSpeed);
        needsUpdate = true;

        break;
      case this.keys.BOTTOM:
        this.pan(0, - this.keyPanSpeed);
        needsUpdate = true;

        break;
      case this.keys.LEFT:
        this.pan(this.keyPanSpeed, 0);
        needsUpdate = true;

        break;
      case this.keys.RIGHT:
        this.pan( - this.keyPanSpeed, 0 );
        needsUpdate = true;

        break;
    }

    if (needsUpdate) {
      // prevent the browser from scrolling on cursor keys
      event.preventDefault();

      this.update();
    }
	}

	protected handleTouchStartRotate() {
    if (pointers.length === 1) {
      rotateStart.set(pointers[0].pageX, pointers[0].pageY);
    } else {
      const x = 0.5 * (pointers[0].pageX + pointers[1].pageX);
      const y = 0.5 * (pointers[0].pageY + pointers[1].pageY);

      rotateStart.set(x, y);
    }
  }

	protected handleTouchStartPan() {
    if (pointers.length === 1) {
      panStart.set(pointers[0].pageX, pointers[0].pageY);
    } else {
      const x = 0.5 * (pointers[0].pageX + pointers[1].pageX);
      const y = 0.5 * (pointers[0].pageY + pointers[1].pageY);

      panStart.set(x, y);
    }
	}

	protected handleTouchStartDolly() {
    const dx = pointers[0].pageX - pointers[1].pageX;
    const dy = pointers[0].pageY - pointers[1].pageY;

    const distance = Math.sqrt(dx * dx + dy * dy);

    dollyStart.set(0, distance);
  }

	protected handleTouchStartDollyPan() {
    if (this.enableZoom) this.handleTouchStartDolly();
    if (this.enablePan) this.handleTouchStartPan();
  }

	protected handleTouchStartDollyRotate() {
    if (this.enableZoom) this.handleTouchStartDolly();
    if (this.enableRotate) this.handleTouchStartRotate();
  }

  protected handleTouchMoveRotate(event: PointerEvent) {
    if (pointers.length == 1) {
      rotateEnd.set(event.pageX, event.pageY);
    } else {
      const position = this.getSecondPointerPosition(event);

      const x = 0.5 * (event.pageX + position.x);
      const y = 0.5 * (event.pageY + position.y);

      rotateEnd.set(x, y);
    }

    rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(this.rotateSpeed);

    const element = this.domElement;

    this.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight); // yes, height

    this.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);

    rotateStart.copy(rotateEnd);
  }

	protected handleTouchMovePan(event: PointerEvent) {
    if (pointers.length === 1) {
      panEnd.set(event.pageX, event.pageY);
    } else {
      const position = this.getSecondPointerPosition(event);

      const x = 0.5 * (event.pageX + position.x);
      const y = 0.5 * (event.pageY + position.y);

      panEnd.set(x, y);
    }

    panDelta.subVectors(panEnd, panStart).multiplyScalar(this.panSpeed);

    this.pan(panDelta.x, panDelta.y);

    panStart.copy(panEnd);
  }

  protected handleTouchMoveDolly( event: PointerEvent ) {
    const position = this.getSecondPointerPosition( event );

    const dx = event.pageX - position.x;
    const dy = event.pageY - position.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    dollyEnd.set(0, distance);

    dollyDelta.set(0, Math.pow(dollyEnd.y / dollyStart.y, this.zoomSpeed));

    this.dollyOut(dollyDelta.y);

    dollyStart.copy(dollyEnd);
  }

  protected handleTouchMoveDollyPan(event: PointerEvent) {
    if (this.enableZoom) this.handleTouchMoveDolly(event);
    if (this.enablePan) this.handleTouchMovePan(event);
  }

	protected handleTouchMoveDollyRotate(event: PointerEvent) {
    if (this.enableZoom) this.handleTouchMoveDolly(event);
    if (this.enableRotate) this.handleTouchMoveRotate(event);
  }

  //
  // event handlers - FSM: listen for events and reset state
  //

	protected onPointerDown(event: PointerEvent) {
    if (this.enabled === false) return;

    if (pointers.length === 0) {
      this.domElement.setPointerCapture(event.pointerId);

      this.domElement.addEventListener('pointermove', event => this.onPointerMove(event));
      this.domElement.addEventListener('pointerup', event => this.onPointerUp(event));
    }

    this.addPointer(event);

    if (event.pointerType === 'touch') this.onTouchStart(event);
    else this.onMouseDown(event);
  }

	protected onPointerMove(event: PointerEvent) {
    if (this.enabled === false) return;

    if (event.pointerType === 'touch') this.onTouchMove(event);
    else this.onMouseMove(event);
  }

	protected onPointerUp(event: PointerEvent) {
    this.removePointer(event);

    if (pointers.length === 0) {
      this.domElement.releasePointerCapture(event.pointerId);

      this.domElement.removeEventListener('pointermove', event => this.onPointerMove(event));
      this.domElement.removeEventListener('pointerup', event => this.onPointerUp(event));
    }

    this.dispatchEvent(_endEvent);
    state = STATE.NONE;
  }

	protected onPointerCancel(event: PointerEvent) {
		this.removePointer(event);
  }

	protected onMouseDown(event: MouseEvent) {
    let mouseAction;

    switch (event.button) {
      case 0:
        mouseAction = this.mouseButtons.LEFT;
        break;
      case 1:
        mouseAction = this.mouseButtons.MIDDLE;
        break;
      case 2:
        mouseAction = this.mouseButtons.RIGHT;
        break;
      default:
        mouseAction = - 1;
    }

    switch (mouseAction) {
      case MOUSE.DOLLY:
        if (this.enableZoom === false) return;

        this.handleMouseDownDolly(event);
        state = STATE.DOLLY;

        break;
      case MOUSE.ROTATE:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.enablePan === false) return;

          this.handleMouseDownPan(event);
          state = STATE.PAN;
        } else {
          if (this.enableRotate === false) return;

          this.handleMouseDownRotate(event);
          state = STATE.ROTATE;
        }

        break;
      case MOUSE.PAN:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.enableRotate === false) return;

          this.handleMouseDownRotate(event);
          state = STATE.ROTATE;
        } else {
          if (this.enablePan === false) return;

          this.handleMouseDownPan(event);
          state = STATE.PAN;
        }

        break;
      default:
        state = STATE.NONE;
    }

    if (state !== STATE.NONE) this.dispatchEvent(_startEvent);
  }

	protected onMouseMove(event: MouseEvent) {
    if (this.enabled === false) return;

    switch (state) {
      case STATE.ROTATE:
        if (this.enableRotate === false) return;

        this.handleMouseMoveRotate(event);

        break;
      case STATE.DOLLY:
        if (this.enableZoom === false) return;

        this.handleMouseMoveDolly(event);

        break;
      case STATE.PAN:
        if (this.enablePan === false) return;

        this.handleMouseMovePan(event);

        break;
    }
  }

	protected onMouseWheel(event: WheelEvent) {
		if (this.enabled === false || this.enableZoom === false || state !== STATE.NONE) return;

    event.preventDefault();

    this.dispatchEvent(_startEvent);
    this.handleMouseWheel(event);
    this.dispatchEvent(_endEvent);
  }

	protected onKeyDown(event: KeyboardEvent) {
    if (this.enabled === false || this.enablePan === false) return;

    this.handleKeyDown(event);
  }

	protected onTouchStart(event: PointerEvent) {
    this.trackPointer(event);

    switch (pointers.length) {
      case 1:
        switch (this.touches.ONE) {
          case TOUCH.ROTATE:
            if (this.enableRotate === false) return;

            this.handleTouchStartRotate();
            state = STATE.TOUCH_ROTATE;

            break;
          case TOUCH.PAN:
            if (this.enablePan === false) return;

            this.handleTouchStartPan();
            state = STATE.TOUCH_PAN;

            break;
          default:
            state = STATE.NONE;
        }

        break;
      case 2:
        switch (this.touches.TWO) {
          case TOUCH.DOLLY_PAN:
            if (this.enableZoom === false && this.enablePan === false) return;

            this.handleTouchStartDollyPan();
            state = STATE.TOUCH_DOLLY_PAN;

            break;
          case TOUCH.DOLLY_ROTATE:
            if (this.enableZoom === false && this.enableRotate === false) return;

            this.handleTouchStartDollyRotate();
            state = STATE.TOUCH_DOLLY_ROTATE;

            break;
          default:
            state = STATE.NONE;
        }

        break;
      default:
        state = STATE.NONE;
    }

    if (state !== STATE.NONE) this.dispatchEvent(_startEvent);
  }

	protected onTouchMove(event: PointerEvent) {
    this.trackPointer(event);

    switch (state) {
      case STATE.TOUCH_ROTATE:
        if (this.enableRotate === false) return;

        this.handleTouchMoveRotate(event);
        this.update();

        break;
      case STATE.TOUCH_PAN:
        if (this.enablePan === false) return;

        this.handleTouchMovePan(event);
        this.update();

        break;
      case STATE.TOUCH_DOLLY_PAN:
        if (this.enableZoom === false && this.enablePan === false) return;

        this.handleTouchMoveDollyPan(event);
        this.update();

        break;
      case STATE.TOUCH_DOLLY_ROTATE:
        if (this.enableZoom === false && this.enableRotate === false) return;

        this.handleTouchMoveDollyRotate(event);
        this.update();

        break;
      default:
        state = STATE.NONE;
    }
  }

	protected onContextMenu(event: MouseEvent) {
    if (this.enabled === false) return;

    event.preventDefault();
  }

	protected addPointer(event: PointerEvent ) {
    pointers.push(event);
  }

	protected removePointer(event: PointerEvent) {
    delete pointerPositions[event.pointerId];

    for (let i = 0; i < pointers.length; i++) {

      if (pointers[i].pointerId == event.pointerId) {
        pointers.splice(i, 1);

        return;
      }
    }
  }

	protected trackPointer(event: PointerEvent) {
    let position = pointerPositions[event.pointerId];

    if (position === undefined) {
      position = new Vector2();
      pointerPositions[event.pointerId] = position;
    }

    position.set(event.pageX, event.pageY);
  }

	protected getSecondPointerPosition(event: PointerEvent) {
    const pointer = (event.pointerId === pointers[0].pointerId) ? pointers[1] : pointers[0];

    return pointerPositions[pointer.pointerId];
  }
}
