

export function breakpoint(fn?: () => boolean) {
    if (!fn || fn()) {
        debugger;
    }
}
