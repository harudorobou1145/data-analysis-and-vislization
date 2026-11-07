def move_one_ball(arr):
    """Return whether right rotations can sort arr in non-decreasing order.

    An empty array is considered sorted. A nonempty array can be rotated
    into sorted order exactly when it has at most one circular descent.
    """
    n = len(arr)
    if n < 2:
        return True

    descents = 0
    for i in range(n):
        if arr[i] > arr[(i + 1) % n]:
            descents += 1
            if descents > 1:
                return False
    return True
