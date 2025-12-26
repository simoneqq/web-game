export const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    crouch: false
};

export function setupInput() {
    const onKeyDown = (e) => {
        if (e.code === "KeyW") keys.forward = true;
        if (e.code === "KeyS") keys.backward = true;
        if (e.code === "KeyA") keys.left = true;
        if (e.code === "KeyD") keys.right = true;
        if (e.code === "Space") keys.jump = true;
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.sprint = true; // shift do sprintu 26/12/25
        if (e.code === "ControlLeft" || e.code === "ControlRight") keys.crouch = true; // ctrl do kucania
    };
    const onKeyUp = (e) => {
        if (e.code === "KeyW") keys.forward = false;
        if (e.code === "KeyS") keys.backward = false;
        if (e.code === "KeyA") keys.left = false;
        if (e.code === "KeyD") keys.right = false;
        if (e.code === "Space") keys.jump = false;
        if (e.code === "ShiftLeft" || e.code === "ShiftRight") keys.sprint = false;
        if (e.code === "ControlLeft" || e.code === "ControlRight") keys.crouch = false;
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
}