/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {EventResponderContext} from 'events/EventTypes';
import {REACT_EVENT_COMPONENT_TYPE} from 'shared/ReactSymbols';

const targetEventTypes = [
  'pointerover',
  'pointermove',
  'pointerout',
  'pointercancel',
];

type HoverState = {
  isHovered: boolean,
  isInHitSlop: boolean,
  isTouched: boolean,
};

// In the case we don't have PointerEvents (Safari), we listen to touch events
// too
if (typeof window !== 'undefined' && window.PointerEvent === undefined) {
  targetEventTypes.push('touchstart', 'mouseover', 'mouseout');
}

function dispatchHoverInEvents(
  context: EventResponderContext,
  props: Object,
  state: HoverState,
): void {
  const {event, eventTarget} = context;
  if (props.onHoverChange) {
    if (context.isTargetWithinEventComponent((event: any).relatedTarget)) {
      return;
    }
    if (props.onHoverIn) {
      context.dispatchEvent('hoverin', props.onHoverIn, eventTarget, true);
    }
    const hoverChangeEventListener = () => {
      props.onHoverChange(true);
    };
    context.dispatchEvent(
      'hoverchange',
      hoverChangeEventListener,
      eventTarget,
      true,
    );
  }
}

function dispatchHoverOutEvents(context: EventResponderContext, props: Object) {
  const {event, eventTarget} = context;
  if (context.isTargetWithinEventComponent((event: any).relatedTarget)) {
    return;
  }
  if (props.onHoverOut) {
    context.dispatchEvent('hoverout', props.onHoverOut, eventTarget, true);
  }
  if (props.onHoverChange) {
    const hoverChangeEventListener = () => {
      props.onHoverChange(false);
    };
    context.dispatchEvent(
      'hoverchange',
      hoverChangeEventListener,
      eventTarget,
      true,
    );
  }
}

const HoverResponder = {
  targetEventTypes,
  createInitialState() {
    return {
      isHovered: false,
      isInHitSlop: false,
      isTouched: false,
    };
  },
  handleEvent(
    context: EventResponderContext,
    props: Object,
    state: HoverState,
  ): void {
    const {eventType, eventTarget, event} = context;

    switch (eventType) {
      case 'touchstart':
        // Touch devices don't have hover support
        if (!state.isTouched) {
          state.isTouched = true;
        }
        break;
      case 'pointerover':
      case 'mouseover': {
        if (
          !state.isHovered &&
          !state.isTouched &&
          !context.isTargetOwned(eventTarget)
        ) {
          if ((event: any).pointerType === 'touch') {
            state.isTouched = true;
            return;
          }
          if (
            context.isPositionWithinTouchHitTarget(
              (event: any).x,
              (event: any).y,
            )
          ) {
            state.isInHitSlop = true;
            return;
          }
          dispatchHoverInEvents(context, props, state);
          state.isHovered = true;
        }
        break;
      }
      case 'pointerout':
      case 'mouseout': {
        if (state.isHovered && !state.isTouched) {
          dispatchHoverOutEvents(context, props);
          state.isHovered = false;
        }
        state.isInHitSlop = false;
        state.isTouched = false;
        break;
      }
      case 'pointermove': {
        if (!state.isTouched) {
          if (state.isInHitSlop) {
            if (
              !context.isPositionWithinTouchHitTarget(
                (event: any).x,
                (event: any).y,
              )
            ) {
              dispatchHoverInEvents(context, props, state);
              state.isHovered = true;
              state.isInHitSlop = false;
            }
          } else if (
            state.isHovered &&
            context.isPositionWithinTouchHitTarget(
              (event: any).x,
              (event: any).y,
            )
          ) {
            dispatchHoverOutEvents(context, props);
            state.isHovered = false;
            state.isInHitSlop = true;
          }
        }
        break;
      }
      case 'pointercancel': {
        if (state.isHovered && !state.isTouched) {
          dispatchHoverOutEvents(context, props);
          state.isHovered = false;
          state.isTouched = false;
        }
        break;
      }
    }
  },
};

export default {
  $$typeof: REACT_EVENT_COMPONENT_TYPE,
  props: null,
  responder: HoverResponder,
};
