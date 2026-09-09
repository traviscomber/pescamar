export type {UniVisionMetrics,SegmentationConfidence,UniVisionMaskMode,UniVisionRoi,UniVisionSegmentation} from './uniVisionRemote'
import {requestUniVisionSegmentationSync} from './uniVisionRemote'

export function analyzeSegmentedCanvas(canvas:HTMLCanvasElement){return requestUniVisionSegmentationSync(canvas)}
