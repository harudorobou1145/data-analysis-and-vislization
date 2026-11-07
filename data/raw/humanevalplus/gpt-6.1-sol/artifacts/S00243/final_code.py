def cycpattern_check(a, b):
    """Return whether b or any rotation of b is a substring of a.

    cycpattern_check("abcd", "abd") => False
    cycpattern_check("hello", "ell") => True
    cycpattern_check("whassup", "psus") => False
    cycpattern_check("abab", "baa") => True
    cycpattern_check("efef", "eeff") => False
    cycpattern_check("himenss", "simen") => True
    """
    if not b:
        return True
    if len(b) > len(a):
        return False
    return any(b[i:] + b[:i] in a for i in range(len(b)))
