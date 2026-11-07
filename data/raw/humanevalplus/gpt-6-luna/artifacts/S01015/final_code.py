def is_nested(string):
    """Return True if a contiguous balanced bracket substring is nested."""
    if not isinstance(string, str):
        return False

    for start, first in enumerate(string):
        if first != "[":
            continue

        depth = 0
        peak = 0
        for bracket in string[start:]:
            if bracket == "[":
                depth += 1
                peak = max(peak, depth)
            elif bracket == "]":
                depth -= 1
                if depth < 0:
                    break
                if depth == 0 and peak >= 2:
                    return True
            else:
                return False

    return False
