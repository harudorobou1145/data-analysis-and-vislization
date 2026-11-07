def cycpattern_check(a, b):
    """Return whether any rotation of ``b`` occurs as a substring of ``a``.

    Examples:
        cycpattern_check("abcd", "abd") -> False
        cycpattern_check("hello", "ell") -> True
        cycpattern_check("abab", "baa") -> True
    """
    # Each rotation of b is a length-len(b) substring of b+b.  Restricting
    # candidates to that length avoids treating a longer part of b+b as a
    # rotation.
    if not b:
        return True
    if len(b) > len(a):
        return False
    doubled = b + b
    return any(doubled[i:i + len(b)] in a for i in range(len(b)))
