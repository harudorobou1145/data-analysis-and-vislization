
def count_distinct_characters(string: str) -> int:
    """Given a string, count distinct characters without regard to case.

    >>> count_distinct_characters('xyzXYZ')
    3
    >>> count_distinct_characters('Jerry')
    4
    """
    return len({character.casefold() for character in string})
