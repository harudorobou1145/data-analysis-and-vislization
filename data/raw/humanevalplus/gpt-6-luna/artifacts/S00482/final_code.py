def is_happy(s):
    """Check whether ``s`` has at least three characters and every
    consecutive group of three characters contains distinct characters.

    Examples:
        is_happy("a") -> False
        is_happy("abcd") -> True
        is_happy("aabb") -> False
        is_happy("adb") -> True
        is_happy("xyy") -> False
    """
    if len(s) < 3:
        return False
    return all(len(set(s[i:i + 3])) == 3 for i in range(len(s) - 2))
