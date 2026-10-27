// Picks the renderer for a stack by unit kind: instanced procedural humanoids for infantry,
// per-unit animated rigs for vehicles.
import { StackRenderer } from './StackRenderer.js';
import { RigRenderer } from './RigRenderer.js';

export function createRenderer(stack, scene) {
  return stack.kind === 'infantry' ? new StackRenderer(stack, scene) : new RigRenderer(stack, scene);
}
