import math
from fractions import Fraction


def poly(xs: list, x: float):
    """Evaluate a polynomial whose coefficients are in ascending order."""
    return sum(coeff * math.pow(x, i) for i, coeff in enumerate(xs))


def find_zero(xs: list):
    """Find and return a real zero of a polynomial with ascending coefficients."""
    if not xs:
        raise ValueError("xs must contain polynomial coefficients")

    # Drop padding; a polynomial whose coefficients are all zero vanishes at 0.
    last = len(xs) - 1
    while last >= 0 and xs[last] == 0:
        last -= 1
    if last < 0:
        return 0.0

    coeffs = [Fraction(c) for c in xs[:last + 1]]

    def sign_at(x):
        # Evaluate exactly at the represented float to avoid overflow and
        # unreliable sign decisions from floating-point cancellation.
        xx = Fraction.from_float(x)
        value = coeffs[-1]
        for c in reversed(coeffs[:-1]):
            value = value * xx + c
        return (value > 0) - (value < 0)

    s0 = sign_at(0.0)
    if s0 == 0:
        return 0.0

    max_float = float.fromhex('0x1.fffffffffffffp+1023')
    bound = 1.0
    bracket = None
    # An odd degree has a sign change on at least one side. Trying both sides
    # also supports even-degree inputs that happen to have a sign-changing root.
    while True:
        for direction in (1.0, -1.0):
            edge = direction * bound
            se = sign_at(edge)
            if se == 0:
                return edge
            if se != s0:
                bracket = (min(0.0, edge), max(0.0, edge))
                break
        if bracket is not None:
            break
        if bound == max_float:
            raise ValueError("polynomial has no representable sign-changing root")
        bound = min(bound * 2.0, max_float)

    lo, hi = bracket
    slo = sign_at(lo)
    # Refine the sign-changing bracket to floating-point precision.
    for _ in range(1100):
        mid = lo + (hi - lo) / 2.0
        if mid == lo or mid == hi:
            return mid
        sm = sign_at(mid)
        if sm == 0:
            return mid
        if sm == slo:
            lo = mid
        else:
            hi = mid
    return lo + (hi - lo) / 2.0
