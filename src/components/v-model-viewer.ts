import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {GLTF, GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {OptionalProp} from '../utils';
import {OrbitControls} from '../three-components/orbit-controls';
import TextureUtils from '../three-components/texture-utils';
import * as Three from 'three';
import Vue, {CreateElement, PropOptions} from 'vue';

type ColorData = {
  [meshName: string]: Three.ColorRepresentation;
}

type CanvasElRef = HTMLCanvasElement;

export type BackgroundProp = OptionalProp<Three.Color | Three.Texture>;

export type ColorsProp = OptionalProp<ColorData>;

export type DataProp = OptionalProp<ArrayBuffer>;

export type DisableRotateProp = boolean;

export type DisableZoomProp = boolean;

export type SrcProp = OptionalProp<string>;

export type Props = {
  background?: BackgroundProp;
  colors?: ColorsProp;
  data?: DataProp;
  disableRotate?: DisableRotateProp;
  disableZoom?: DisableZoomProp;
  src?: SrcProp;
}

export default Vue.extend({
  name: 'v-model-viewer',

  inheritAttrs: true,

  props: {
    background: {
      default: null,
      validator: value => {
        if (
          !(value instanceof Three.Color) &&
          !(value instanceof Three.Texture)
        ) return false;
        else return true;
      }
    } as PropOptions<BackgroundProp>,
    cameraOrbit: {
      type: String,
      default: '0deg 45deg',
      validator(value: string) {
        return /^(((\d{1,3}deg)|(\d+(.\d+)?rad)) ((\d{1,3}deg)|(\d+(.\d+)?rad)))$/.test(value);
      }
    },
    colors: {
      default: () => ({}),
      validator: value => {
        for (const meshName in value) {
          if (
            !(value[meshName] instanceof Three.Color) &&
            typeof value[meshName] !== 'string' &&
            typeof value[meshName] !== 'number'
          ) return false;
        }

        return true;
      }
    } as PropOptions<ColorsProp>,
    data: {
      type: ArrayBuffer,
      default: null
    } as PropOptions<DataProp>,
    disableRotate: Boolean as PropOptions<DisableRotateProp>,
    disableZoom: Boolean as PropOptions<DisableZoomProp>,
    src: {
      type: String,
      default: null
    } as PropOptions<SrcProp>
  },

  data() {
    return {
      camera: <Three.PerspectiveCamera | null>null,
      controls: <OrbitControls | null>null,
      resizeObserver: <ResizeObserver | null>null,
      renderer: <Three.WebGLRenderer | null>null,
      idealAspect: 0,
      model: <Three.Object3D | null>null,
      scene: <Three.Scene | null>null
    };
  },

  watch: {
    background(value) {
      if (this.scene) this.scene.background = value;
    },

    cameraOrbit(value) {
      const {theta, phi} = this.parseCameraOrbitString(value);

      this.controls?.setOrbit(theta, phi);
    },

    colors(value: ColorsProp) {
      if (value) this.setColors(value);
    },

    data() {
      this.attemptToAddModelFromPropsToScene();
    },

    disableRotate(value: boolean) {
      if (this.controls) this.controls.enableRotate = !value;
    },

    disableZoom(value: boolean) {
      if (this.controls) this.controls.enableZoom = !value;
    },

    src() {
      this.attemptToAddModelFromPropsToScene();
    }
  },

  mounted() {
    this.init();
  },

  beforeDestroy() {
    this.deinit();
  },

  render(c: CreateElement) {
    return c(
      'div',
      {
        staticClass: 'v-model-viewer',
        staticStyle: {
          height: '100%',
          width: '100%'
        }
      },
      [
        c(
          'canvas',
          {
            ref: 'canvasEl',
            staticClass: 'v-model-viewer__canvas'
          }
        )
      ]
    );
  },

  methods: {
    init() {
      const rootElDimensions = this.getRootElDimensions();
      const rootElHeight = rootElDimensions.height;
      const rootElWidth = rootElDimensions.width;

      // Initialize renderer
      const renderer = new Three.WebGLRenderer({
        antialias: true,
        canvas: <CanvasElRef>this.$refs.canvasEl
      });

      this.renderer = renderer;
      renderer.toneMapping = Three.ACESFilmicToneMapping;
      this.setRendererSize(rootElWidth, rootElHeight);
      renderer.outputEncoding = Three.sRGBEncoding;
      renderer.physicallyCorrectLights = true;

      // Initialize camera
      const cameraAspect = rootElWidth / rootElHeight;
      const camera = new Three.PerspectiveCamera(45, cameraAspect, 0.1, 2000);

      this.camera = camera;
      this.setCameraAspect(cameraAspect);

      // Initialize controls
      const controls = new OrbitControls(camera, renderer.domElement);

      this.controls = controls;
      this.controls.enableRotate = !this.disableRotate;
      this.controls.enableZoom = !this.disableZoom;

      // Initialize scene
      const scene = new Three.Scene();

      this.scene = scene;
      scene.background = this.background;

      // Initialize listeners
      const resizeObserser = new ResizeObserver(this.onResize);

      resizeObserser.observe(this.$el);
      window.addEventListener('resize', this.onWindowResize);

      if (this.cameraOrbit) {
        const {theta, phi} = this.parseCameraOrbitString(this.cameraOrbit);

        this.controls?.setOrbit(theta, phi);
      }

      this.animate();

      this.applyEnvironmentMap().then(this.attemptToAddModelFromPropsToScene);
    },

    deinit() {
      // Deinitialize listeners
      this.resizeObserver?.disconnect();
      window.removeEventListener('resize', this.onWindowResize);

      // Deinitialize Three components
      this.controls?.dispose();
      this.renderer?.dispose();
    },

    setColors(colors: ColorData = {}) {
      if (!this.model) return;

      for (const meshName in colors) {
        const model = (<Three.Object3D>this.model);
        const targetMesh = <Three.Mesh<Three.BufferGeometry, Three.MeshStandardMaterial> | undefined>model.getObjectByName(meshName);
        const color = new Three.Color(colors[meshName]);

        if (targetMesh) targetMesh.material.color.set(color);
      }
    },

    setRendererSize(width: number, height: number) {
      this.renderer!.setSize(width, height);
    },

    setCameraAspect(cameraAspect: number) {
      this.camera!.aspect = cameraAspect;
      this.camera!.updateProjectionMatrix();
    },

    setCameraPosition(x: number, y: number, z: number) {
      this.camera!.position.set(x, y, z);
      this.controls!.update();
    },

    getRootElDimensions() {
      const {height, width} = this.$el.getBoundingClientRect();

      return {height, width};
    },

    getCenterPoint(object3D: Three.Object3D) {
      const center = new Three.Vector3();
      const box = new Three.Box3().setFromObject(object3D);

      center.x = (box.max.x + box.min.x) / 2;
      center.y = (box.max.y + box.min.y) / 2;
      center.z = (box.max.z + box.min.z) / 2;

      object3D.localToWorld(center);

      return center;
    },

    onResize() {
      const {height, width} = this.getRootElDimensions();
      const cameraAspect = width / height;

      this.setCameraAspect(cameraAspect);
      this.setRendererSize(width, height);
    },

    onWindowResize() {
      const {height, width} = this.getRootElDimensions();
      const cameraAspect = width / height;

      this.setCameraAspect(cameraAspect);
      this.setRendererSize(width, height);
    },

    animate() {
      this.renderer!.render(this.scene!, this.camera!);
      requestAnimationFrame(this.animate);
    },

    addModelToScene(model: Three.Group) {
      if (this.model) this.scene?.remove(this.model);

      const modelCenter = this.getCenterPoint(model);

      this.model = model;
      (<Three.Scene>this.scene).add(model);

      if (this.colors) this.setColors(this.colors);

      (<OrbitControls>this.controls).target.set(modelCenter.x, modelCenter.y, 0);

      this.setCameraPosition(modelCenter.x, modelCenter.y, this.idealCameraDistance());
    },

    async applyEnvironmentMap() {
      const textureUtils = new TextureUtils(this.renderer!);
      const environmentMap = await textureUtils.generateEnvironmentMap('neutral');

      this.scene!.environment = environmentMap;
    },

    idealCameraDistance() {
      const fovDeg = this.camera!.fov;
      const box = new Three.Box3().setFromObject(this.model!);
      const size = box.getSize(new Three.Vector3());
      const distance = size.y / (2 * Math.tan(fovDeg * Math.PI / 360));

      return distance + (size.y / 2);
    },

    gltfLoaderFactory() {
      const dracoLoader = new DRACOLoader();
      const loader = new GLTFLoader();

      dracoLoader.setDecoderPath('three/examples/js/libs/draco/gltf/');
      loader.setDRACOLoader(dracoLoader);

      return loader;
    },

    attemptToAddModelFromPropsToScene() {
      return this.attemptToLoadGltfFromProps().then(gltf => {
        if (gltf) {
          this.addModelToScene(gltf.scene);

          return true;
        } else return false;
      });
    },

    attemptToLoadGltfFromProps() {
      if (this.data) return this.loadGltfFromArrayBuffer(this.data);
      else if (this.src) return this.loadGltfFromUrl(this.src);
      else return Promise.resolve();
    },

    loadGltfFromArrayBuffer(data: ArrayBuffer): Promise<GLTF> {
      const loader = this.gltfLoaderFactory();

      return new Promise((resolve, reject) => {
        loader.parse(<ArrayBuffer>data, '', resolve, reject);
      });
    },

    loadGltfFromUrl(url: string): Promise<GLTF> {
      const loader = this.gltfLoaderFactory();

      return new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
    },

    parseCameraOrbitString(cameraOrbit: string) {
      const cameraOrbitStringRegEx = /^(?:(?:(?:(-?\d{1,3})deg)|(?:(\d+(?:.\d+)?)rad)) (?:(?:(-?\d{1,3})deg)|(?:(\d+(?:.\d+)?)rad)))$/;
      const results = cameraOrbit.match(cameraOrbitStringRegEx);

      if (!results?.length) throw new Error('invalid camera orbit string');

      const thetaDeg = parseInt(results[1]);
      const thetaRad = parseInt(results[2]);
      const phiDeg = parseInt(results[3]);
      const phiRad = parseInt(results[4]);

      return {
        theta: !isNaN(thetaRad) ? thetaRad : Three.MathUtils.degToRad(thetaDeg),
        phi: !isNaN(phiRad) ? phiRad : Three.MathUtils.degToRad(phiDeg),
      };
    }
  }
});
