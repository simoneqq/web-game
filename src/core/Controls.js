export const keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false
};

export function setupInput() {
    const onKeyDown = (e) => {
        if (e.code === "KeyW") keys.forward = true;
        if (e.code === "KeyS") keys.backward = true;
        if (e.code === "KeyA") keys.left = true;
        if (e.code === "KeyD") keys.right = true;
        if (e.code === "Space") keys.jump = true;
    };
    const onKeyUp = (e) => {
        if (e.code === "KeyW") keys.forward = false;
        if (e.code === "KeyS") keys.backward = false;
        if (e.code === "KeyA") keys.left = false;
        if (e.code === "KeyD") keys.right = false;
        if (e.code === "Space") keys.jump = false;
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
}