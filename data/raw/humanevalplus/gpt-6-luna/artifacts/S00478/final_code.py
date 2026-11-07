def move_one_ball(arr):
    """Return whether a right rotation can sort ``arr`` non-decreasingly.

    A cyclic sequence is a rotation of a sorted sequence exactly when it has
    at most one adjacent decrease, counting the last-to-first boundary.
    """
    n = len(arr)
    if n <= 1:
        return True

    decreases = sum(arr[i] > arr[(i + 1) % n] for i in range(n))
    return decreases <= 1
