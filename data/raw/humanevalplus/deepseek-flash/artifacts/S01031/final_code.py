import math


def poly(xs: list, x: float):
    """
    Evaluates polynomial with coefficients xs at point x.
    return xs[0] + xs[1] * x + xs[1] * x^2 + .... xs[n] * x^n
    """
    return sum([coeff * math.pow(x, i) for i, coeff in enumerate(xs)])


def _trim(coefficients: list) -> list:
    """Return a copy without zero coefficients at the highest powers."""
    result = list(coefficients)
    while result and result[-1] == 0:
        result.pop()
    return result


def _poly_value(coefficients: list, x: float) -> float:
    """Evaluate a polynomial by Horner's rule."""
    value = coefficients[-1]
    for coefficient in reversed(coefficients[:-1]):
        value = value * x + coefficient
    return value


def _derivative(coefficients: list) -> list:
    """Return the coefficient list of the derivative."""
    return [i * coefficient for i, coefficient in enumerate(coefficients)][1:]


def _root_bound(coefficients: list) -> float:
    """A finite bound containing every real root of the polynomial."""
    leading = abs(coefficients[-1])
    largest_ratio = 0.0
    for coefficient in coefficients[:-1]:
        ratio = abs(coefficient) / leading
        if ratio > largest_ratio:
            largest_ratio = ratio
    return 1.0 + largest_ratio


def _bisect(coefficients: list, low: float, high: float):
    """Find a zero in an interval whose endpoint values have opposite signs."""
    value_low = _poly_value(coefficients, low)
    value_high = _poly_value(coefficients, high)

    if value_low == 0.0:
        return low
    if value_high == 0.0:
        return high

    for _ in range(1100):
        midpoint = low / 2.0 + high / 2.0
        if midpoint == low or midpoint == high:
            return midpoint

        value_mid = _poly_value(coefficients, midpoint)
        if value_mid == 0.0:
            return midpoint

        if (value_mid > 0.0) == (value_low > 0.0):
            low = midpoint
            value_low = value_mid
        else:
            high = midpoint
            value_high = value_mid

    return low / 2.0 + high / 2.0


def _add_root(roots: list, candidate: float) -> None:
    """Add a candidate while suppressing numerically duplicate roots."""
    if not math.isfinite(candidate):
        return
    tolerance = 1e-9 * max(1.0, abs(candidate))
    for root in roots:
        if abs(root - candidate) <= tolerance:
            return
    roots.append(candidate)


def _term_scale(coefficients: list, x: float) -> float:
    """Magnitude scale of the polynomial's terms at x."""
    scale = 0.0
    power = 1.0
    for coefficient in coefficients:
        scale += abs(coefficient) * power
        power *= abs(x)
    return scale


def _is_numerical_zero(coefficients: list, x: float, value: float) -> bool:
    scale = _term_scale(coefficients, x)
    if not math.isfinite(value) or not math.isfinite(scale):
        return False
    return abs(value) <= 1e-11 * scale


def _real_roots(coefficients: list) -> list:
    """Return all real roots of a polynomial of modest degree.

    Critical points (the roots of the derivative) split the real line into
    monotonic intervals.  This lets the same recursion find roots of even
    multiplicity as well as ordinary sign-changing roots.
    """
    coefficients = _trim(coefficients)
    degree = len(coefficients) - 1

    if degree <= 0:
        return []
    if degree == 1:
        return [-coefficients[0] / coefficients[1]]

    bound = _root_bound(coefficients)
    if not math.isfinite(bound):
        return []

    critical_points = _real_roots(_derivative(coefficients))
    points = [-bound]
    for point in sorted(critical_points):
        if -bound < point < bound:
            if not math.isclose(point, points[-1], rel_tol=1e-10, abs_tol=1e-12):
                points.append(point)
    if not math.isclose(bound, points[-1], rel_tol=1e-10, abs_tol=1e-12):
        points.append(bound)

    roots = []
    values = []
    for point in points:
        value = _poly_value(coefficients, point)
        values.append(value)
        if _is_numerical_zero(coefficients, point, value):
            _add_root(roots, point)

    for i in range(len(points) - 1):
        left_value = values[i]
        right_value = values[i + 1]
        if left_value == 0.0 or right_value == 0.0:
            continue
        if (left_value > 0.0) != (right_value > 0.0):
            _add_root(roots, _bisect(coefficients, points[i], points[i + 1]))

    return sorted(roots)


def _bracketed_zero(coefficients: list) -> float:
    """Fallback bracket-and-bisect routine for one guaranteed real root."""
    bound = 1.0
    while True:
        low = -bound
        high = bound
        value_low = _poly_value(coefficients, low)
        value_high = _poly_value(coefficients, high)

        if value_low == 0.0:
            return low
        if value_high == 0.0:
            return high
        if (value_low > 0.0) != (value_high > 0.0):
            return _bisect(coefficients, low, high)

        bound *= 2.0
        if not math.isfinite(bound):
            return low


def _refine_root(coefficients: list, root: float) -> float:
    """Polish a root with Newton steps when doing so improves its residual."""
    derivative = _derivative(coefficients)
    current = root
    current_value = abs(_poly_value(coefficients, current))

    for _ in range(20):
        slope = _poly_value(derivative, current)
        if slope == 0.0 or not math.isfinite(slope):
            break
        candidate = current - _poly_value(coefficients, current) / slope
        if not math.isfinite(candidate):
            break
        candidate_value = abs(_poly_value(coefficients, candidate))
        if candidate_value > current_value:
            break
        if candidate == current:
            break
        current = candidate
        current_value = candidate_value

    # Floating-point rounding can leave an exactly representable integer root
    # one ulp away.  Snap only when the integer really is a numerical zero.
    nearest_integer = round(current)
    if abs(current - nearest_integer) <= 1e-9 * max(1.0, abs(current)):
        integer_root = float(nearest_integer)
        value = _poly_value(coefficients, integer_root)
        scale = _term_scale(coefficients, integer_root)
        if math.isfinite(value) and math.isfinite(scale):
            if abs(value) <= 1e-10 * scale:
                return integer_root

    return current


def find_zero(xs: list):
    """ xs are coefficients of a polynomial.
    find_zero find x such that poly(x) = 0.
    find_zero returns only only zero point, even if there are many.
    Moreover, find_zero only takes list xs having even number of coefficients
    and largest non zero coefficient as it guarantees
    a solution.
    >>> round(find_zero([1, 2]), 2) # f(x) = 1 + 2x
    -0.5
    >>> round(find_zero([-6, 11, -6, 1]), 2) # (x - 1) * (x - 2) * (x - 3) = -6 + 11x - 6x^2 + x^3
    1.0
    """
    coefficients = _trim(xs)
    if not coefficients:
        return 0.0

    degree = len(coefficients) - 1
    if degree == 0:
        return 0.0
    if degree == 1:
        return -coefficients[0] / coefficients[1]

    # Normalize by coefficient magnitude.  This does not change the roots but
    # substantially reduces overflow/underflow in the recursive isolation.
    scale = max(abs(coefficient) for coefficient in coefficients)
    normalized = [coefficient / scale for coefficient in coefficients]

    # Keep the recursive method for ordinary polynomial sizes.  The direct
    # bracket method remains reliable for exceptionally long coefficient lists.
    if degree > 128:
        return _bracketed_zero(normalized)

    roots = _real_roots(normalized)

    # Keep only numerically valid roots, then choose the root nearest zero.
    # This is deterministic and also matches naturally starting a search at 0.
    valid_roots = []
    for root in roots:
        value = _poly_value(normalized, root)
        scale_at_root = _term_scale(normalized, root)
        if (
            math.isfinite(value)
            and math.isfinite(scale_at_root)
            and abs(value) <= 1e-8 * scale_at_root
        ):
            valid_roots.append(root)

    if valid_roots:
        root = min(valid_roots, key=lambda candidate: (abs(candidate), candidate))
        return _refine_root(normalized, root)

    return _bracketed_zero(normalized)
