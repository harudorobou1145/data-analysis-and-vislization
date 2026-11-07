import math
from fractions import Fraction


def poly(xs: list, x: float):
    """Evaluate a polynomial whose coefficients are in ascending order."""
    return sum([coeff * math.pow(x, i) for i, coeff in enumerate(xs)])


def find_zero(xs: list):
    """Return a real zero of an odd-degree polynomial (ascending coefficients)."""
    if not xs:
        raise ValueError("xs must contain polynomial coefficients")

    # Ignore any redundant trailing zero coefficients.  The specified inputs
    # have odd degree, but trimming also handles a padded representation.
    last = len(xs) - 1
    while last >= 0 and xs[last] == 0:
        last -= 1
    if last < 0:
        return 0.0
    coeffs = [Fraction(c) for c in xs[:last + 1]]
    if last % 2 == 0:
        raise ValueError("polynomial must have odd degree to guarantee a real zero")

    def sign_at(x):
        # Exact evaluation at the binary floating-point x avoids overflow and
        # cancellation artifacts when deciding which side of a root we are on.
        xx = Fraction.from_float(x)
        value = coeffs[-1]
        for c in reversed(coeffs[:-1]):
            value = value * xx + c
        return (value > 0) - (value < 0)

    s0 = sign_at(0.0)
    if s0 == 0:
        return 0.0

    # Move out from zero toward an end of the real line where the sign must
    # differ.  For odd degree the sign at -infinity is opposite that at +infinity.
    direction = 1.0 if s0 != (1 if coeffs[-1] > 0 else -1) else -1.0
    bound = 1.0
    max_float = float.fromhex('0x1.fffffffffffffp+1023')
    while True:
        edge = direction * bound
        se = sign_at(edge)
        if se == 0:
            return edge
        if se != s0:
            break
        if bound == max_float:
            raise OverflowError("no representable float brackets a real zero")
        bound = min(bound * 2.0, max_float)

    if direction > 0:
        lo, hi = 0.0, bound
    else:
        lo, hi = -bound, 0.0
    slo = sign_at(lo)
    # Bisection until no representable number remains between endpoints.
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
