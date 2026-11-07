def is_nested(string):
    """Return whether *string* contains a nested balanced bracket subsequence.

    A balanced subsequence with nesting depth at least two contains, in order,
    two opening brackets followed by two closing brackets. Conversely, those
    four selected brackets form the valid nested subsequence ``[[]]``. Other
    characters can be skipped, as allowed by the subsequence definition.
    """
    openings = 0
    closes_after_two_openings = 0

    for bracket in string:
        if bracket == "[":
            openings += 1
        elif bracket == "]" and openings >= 2:
            closes_after_two_openings += 1
            if closes_after_two_openings == 2:
                return True

    return False
