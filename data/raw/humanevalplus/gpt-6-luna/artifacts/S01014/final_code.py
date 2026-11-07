def is_nested(string):
    """Return True if a nested balanced bracket subsequence exists.

    It is sufficient and necessary to choose two opening brackets followed
    later by two closing brackets: these four symbols form ``[[]]``, and any
    balanced subsequence that reaches depth two has such an ordering.
    """
    if not isinstance(string, str):
        return False

    openings = 0
    closes_after_two_openings = 0

    for bracket in string:
        if bracket == "[":
            openings += 1
        elif bracket == "]":
            if openings >= 2:
                closes_after_two_openings += 1
                if closes_after_two_openings >= 2:
                    return True
        else:
            # The specified input alphabet is only '[' and ']'. Treat an
            # out-of-alphabet symbol as invalid rather than silently skipping it.
            return False

    return False
